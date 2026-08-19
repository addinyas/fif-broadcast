const { pool } = require('./db');
const { emitInboxNew } = require('./events');
const { loadRules, pickReply } = require('./auto-reply');
const ai = require('./ai');

const POLL_INTERVAL_MS = 2000;
let timer = null;

function normalizeJid(jid) {
  return String(jid || '').split('@')[0];
}

function getContactPhone(remoteJid) {
  const bare = normalizeJid(remoteJid);
  if (bare.startsWith('62')) return `0${bare.slice(2)}`;
  return bare;
}

async function upsertConversation(userId, remoteJid, contactName, lastBody) {
  const phone = getContactPhone(remoteJid);
  const now = new Date();
  const result = await pool.query(
    `INSERT INTO conversations (user_id, remote_jid, contact_name, contact_phone, last_message, last_message_at, is_read, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, FALSE, $6, $6)
     ON CONFLICT (user_id, remote_jid)
     DO UPDATE SET contact_name = COALESCE(EXCLUDED.contact_name, conversations.contact_name),
                   last_message = EXCLUDED.last_message,
                   last_message_at = EXCLUDED.last_message_at,
                   is_read = FALSE,
                   updated_at = EXCLUDED.updated_at
     RETURNING id, is_read`,
    [userId, remoteJid, contactName || null, phone, lastBody || null, now]
  );
  return result.rows[0].id;
}

async function captureInboundMessage(userId, remoteJid, msg) {
  const body = msg?.message?.conversation
    || msg?.message?.extendedTextMessage?.text
    || msg?.message?.imageMessage?.caption
    || null;

  if (!body) return null;

  const name = msg?.pushName || null;
  const conversationId = await upsertConversation(userId, remoteJid, name, body);

  const saved = await pool.query(
    `INSERT INTO conversation_messages (conversation_id, direction, body, wa_message_id, is_read, status, created_at, updated_at)
     VALUES ($1, 'inbound', $2, $3, FALSE, 'sent', NOW(), NOW())
     RETURNING id, conversation_id, direction, body, wa_message_id, is_read, status, created_at`,
    [conversationId, body, msg?.key?.id || null]
  );

  emitInboxNew(userId, saved.rows[0]);

  await maybeAutoReply(userId, conversationId, remoteJid, body);
  const score = await maybeClassifyProspect(userId, body);
  await linkToBroadcast(userId, conversationId, score);

  return saved.rows[0];
}

async function maybeClassifyProspect(userId, body) {
  try {
    const score = await ai.classify(body);
    if (!score) return null;

    await pool.query(
      `UPDATE customers c
       SET prospect_score = $2, updated_at = NOW()
       FROM conversations cv
       WHERE cv.user_id = $1
         AND RIGHT(c.phone_number, 10) = RIGHT(cv.contact_phone, 10)`,
      [userId, score]
    );
    console.log(`[AI] Classified customer as ${score}% (user ${userId})`);
    return score;
  } catch (err) {
    console.error('[AI] Classify failed:', err.message);
    return null;
  }
}

async function maybeAutoReply(userId, conversationId, remoteJid, body) {
  try {
    const aiReply = await ai.suggestReply(body);
    const replyBody = aiReply || pickReply(await loadRules(), userId, body);
    if (!replyBody) return;

    await pool.query(
      `INSERT INTO conversation_messages (conversation_id, direction, body, is_read, status, created_at, updated_at)
       VALUES ($1, 'outbound', $2, TRUE, 'pending', NOW(), NOW())`,
      [conversationId, replyBody]
    );
  } catch (err) {
    console.error(`[AutoReply] Failed to queue reply for user ${userId}:`, err.message);
  }
}

async function linkToBroadcast(userId, conversationId, score) {
  try {
    const conversation = await pool.query(
      `SELECT contact_phone FROM conversations WHERE id = $1`, [conversationId]
    );
    if (!conversation.rows.length) return;

    const phone = conversation.rows[0].contact_phone;
    if (!phone) return;

    const updated = await pool.query(
      `UPDATE broadcast_histories
       SET replied_at = COALESCE(replied_at, NOW()),
           prospect_score = $3,
           updated_at = NOW()
       WHERE marketing_id = $1
         AND status = 'sent'
         AND RIGHT(exact_message, 1) != ''
         AND customer_id IN (
           SELECT id FROM customers
           WHERE marketing_id = $1
             AND RIGHT(phone_number, 10) = RIGHT($2, 10)
         )
       AND id = (
           SELECT id FROM broadcast_histories
           WHERE marketing_id = $1
             AND status = 'sent'
             AND customer_id IN (
               SELECT id FROM customers
               WHERE marketing_id = $1
                 AND RIGHT(phone_number, 10) = RIGHT($2, 10)
             )
           ORDER BY sent_at DESC
           LIMIT 1
         )`,
      [userId, phone, score]
    );
    if (updated.rowCount > 0) {
      console.log(`[Inbox] Linked reply to broadcast for user ${userId}, score=${score}`);
    }
  } catch (err) {
    console.error('[Inbox] linkToBroadcast failed:', err.message);
  }
}

async function processOutboundQueue() {
  const rows = await pool.query(
    `SELECT cm.id, cm.conversation_id, cm.body, c.user_id, c.remote_jid
     FROM conversation_messages cm
     JOIN conversations c ON c.id = cm.conversation_id
     WHERE cm.direction = 'outbound' AND cm.status = 'pending'
     ORDER BY cm.created_at
     LIMIT 10`
  );

  for (const row of rows.rows) {
    try {
      const { sendMessage } = require('./wa-manager');
      await sendMessage(row.user_id, row.remote_jid, row.body);
      await pool.query(
        `UPDATE conversation_messages SET status = 'sent', wa_message_id = COALESCE($2, wa_message_id), updated_at = NOW() WHERE id = $1`,
        [row.id, null]
      );
    } catch (err) {
      console.error(`[Inbox] Failed to send reply #${row.id}:`, err.message);
      await pool.query(
        `UPDATE conversation_messages SET status = 'failed', updated_at = NOW() WHERE id = $1`,
        [row.id]
      );
    }
  }
}

function startInboxQueue() {
  if (timer) return;
  console.log('[Inbox] Outbound reply queue started');
  timer = setInterval(() => {
    processOutboundQueue().catch((err) => {
      console.error('[Inbox] Outbound queue error:', err.message);
    });
  }, POLL_INTERVAL_MS);
}

function stopInboxQueue() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { captureInboundMessage, startInboxQueue, stopInboxQueue, normalizeJid, getContactPhone };
