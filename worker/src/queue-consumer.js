const { getWritableDb } = require('./db');
const { isConnectedForUser, getConnectedUsers, lastConnectedAt } = require('./wa-client');
const { sendMessage } = require('./wa-manager');
const { emitBroadcastStatus, emitPendingStuck } = require('./events');

const MIN_DELAY = parseInt(process.env.MIN_DELAY_SEC || '60', 10);
const MAX_DELAY = parseInt(process.env.MAX_DELAY_SEC || '180', 10);
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);
const MAX_RETRY = 3;
const PENDING_STUCK_THRESHOLD = 5;
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || '';
const WARMUP_GRACE_MS = 10_000;

let running = false;
let processing = false;
let intervalId = null;

function randomDelay() {
  return Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1) + MIN_DELAY) * 1000;
}

async function sendPushNotification(userId, title, body) {
  if (!FCM_SERVER_KEY) return;
  try {
    const db = getWritableDb();
    const user = db.prepare('SELECT fcm_token FROM users WHERE id = ?').get(userId);
    if (!user?.fcm_token) return;
    await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: user.fcm_token,
        notification: { title, body },
        priority: 'high',
      }),
    });
  } catch (err) {
    console.error(`[Push] Failed to send notification to user ${userId}:`, err.message);
  }
}

async function processPending() {
  if (processing) return;
  processing = true;

  try {
    const writeDb = getWritableDb();
    const pending = writeDb.prepare(`
      SELECT bh.id, bh.customer_id, bh.marketing_id, bh.exact_message, bh.retry_count, c.phone_number
      FROM broadcast_histories bh
      JOIN customers c ON c.id = bh.customer_id
      WHERE bh.status = 'pending' AND bh.id IN (
        SELECT id FROM broadcast_histories WHERE status = 'pending' ORDER BY RANDOM() LIMIT 5
      )
    `).all();

    if (pending.length === 0) return;

    const connectedUsers = getConnectedUsers();
    const toProcess = pending.filter((row) => connectedUsers.includes(row.marketing_id));
    const stuckPending = pending.filter((row) => !connectedUsers.includes(row.marketing_id));

    if (toProcess.length === 0) {
      console.log('[Queue] No connected WA clients for pending broadcasts');
      const seenMarketingIds = new Set();
      for (const row of stuckPending) {
        if (seenMarketingIds.has(row.marketing_id)) continue;
        seenMarketingIds.add(row.marketing_id);
        const count = writeDb.prepare(
          "SELECT COUNT(*) as cnt FROM broadcast_histories WHERE marketing_id = ? AND status = 'pending'"
        ).get(row.marketing_id);
        if (count.cnt > PENDING_STUCK_THRESHOLD) {
          emitPendingStuck(row.marketing_id, { pending_count: count.cnt });
        }
      }
      return;
    }

    console.log(`[Queue] Processing ${toProcess.length} pending broadcast(s)`);
    const stats = {};

    for (const row of toProcess) {
      writeDb.prepare(`
        UPDATE broadcast_histories SET status = 'processing', updated_at = datetime('now')
        WHERE id = ?
      `).run(row.id);

      emitBroadcastStatus(row.marketing_id, { customer_id: row.customer_id, status: 'processing' });

      try {
        if (!stats[row.marketing_id]) stats[row.marketing_id] = { sent: 0, failed: 0 };

        const lastConn = lastConnectedAt.get(row.marketing_id) || 0;
        const elapsed = Date.now() - lastConn;
        if (elapsed < WARMUP_GRACE_MS) {
          const extraDelay = WARMUP_GRACE_MS - elapsed;
          console.log(`[Queue] Warmup delay ${extraDelay}ms for user ${row.marketing_id}`);
          await new Promise(r => setTimeout(r, extraDelay));
        }

        const raw = row.phone_number.replace(/[^0-9]/g, '');
        const normalized = raw.startsWith('0') ? '62' + raw.slice(1) : raw;
        const jid = `${normalized}@s.whatsapp.net`;
        await sendMessage(row.marketing_id, jid, row.exact_message);

        stats[row.marketing_id].sent++;
        writeDb.prepare(`
          UPDATE broadcast_histories
          SET status = 'sent', sent_at = datetime('now'), updated_at = datetime('now')
          WHERE id = ?
        `).run(row.id);

        emitBroadcastStatus(row.marketing_id, { customer_id: row.customer_id, status: 'sent' });
        console.log(`[Queue] Sent #${row.id} (marketing ${row.marketing_id}) to ${row.phone_number}`);
      } catch (err) {
        const errMsg = err.message || 'Unknown error';
        const currentRetry = row.retry_count || 0;

        if (currentRetry < MAX_RETRY) {
          writeDb.prepare(`
            UPDATE broadcast_histories
            SET status = 'pending', retry_count = ?, error_log = ?, updated_at = datetime('now')
            WHERE id = ?
          `).run(currentRetry + 1, errMsg, row.id);

          console.warn(`[Queue] Failed #${row.id} (retry ${currentRetry + 1}/${MAX_RETRY}): ${errMsg}`);
        } else {
          if (!stats[row.marketing_id]) stats[row.marketing_id] = { sent: 0, failed: 0 };
          stats[row.marketing_id].failed++;
          writeDb.prepare(`
            UPDATE broadcast_histories
            SET status = 'failed', error_log = ?, updated_at = datetime('now')
            WHERE id = ?
          `).run(errMsg, row.id);

          emitBroadcastStatus(row.marketing_id, { customer_id: row.customer_id, status: 'failed', error: errMsg });
          console.error(`[Queue] Failed #${row.id} (max retries): ${errMsg}`);
        }
      }

      const delay = randomDelay();
      console.log(`[Queue] Waiting ${delay / 1000}s (anti-ban)`);
      await new Promise((r) => setTimeout(r, delay));
    }

    for (const [mid, s] of Object.entries(stats)) {
      if (s.sent > 0 || s.failed > 0) {
        sendPushNotification(parseInt(mid), 'Broadcast Selesai', `${s.sent} terkirim, ${s.failed} gagal`);
      }
    }
  } catch (err) {
    console.error('[Queue] Error:', err.message);
  } finally {
    processing = false;
  }
}

function startQueue() {
  if (running) return;
  running = true;
  console.log(`[Queue] Started (poll every ${POLL_INTERVAL}ms, delay ${MIN_DELAY}-${MAX_DELAY}s)`);
  intervalId = setInterval(processPending, POLL_INTERVAL);
}

function stopQueue() {
  running = false;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  console.log('[Queue] Stopped');
}

module.exports = { startQueue, stopQueue };
