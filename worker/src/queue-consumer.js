const { getWritableDb } = require('./db');
const { isConnectedForUser, getConnectedUsers, lastConnectedAt } = require('./wa-client');
const { sendMessage } = require('./wa-manager');
const { emitBroadcastStatus, emitPendingStuck, emitNotificationNew, emitBroadcastProgress, emitBroadcastGlobalStatus } = require('./events');
const { loadSettings, randomBetween } = require('./broadcast-config');

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);
const NOTIF_POLL_INTERVAL = parseInt(process.env.NOTIF_POLL_INTERVAL_MS || '5000', 10);
const PENDING_STUCK_THRESHOLD = 5;
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || '';
const WARMUP_GRACE_MS = 10_000;

let running = false;
let pollIntervalId = null;
let notifIntervalId = null;
const lastNotifId = new Map();

const activeProcessors = new Map();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

function emitUserProgress(db, userId) {
  const progress = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
      SUM(CASE WHEN status = 'sent' AND created_at >= date('now', 'start of day') THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'failed' AND created_at >= date('now', 'start of day') THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'cancelled' AND created_at >= date('now', 'start of day') THEN 1 ELSE 0 END) as cancelled,
      COUNT(*) as total
    FROM broadcast_histories
    WHERE marketing_id = ?
  `).get(userId);

  emitBroadcastProgress(userId, {
    pending: progress?.pending || 0,
    processing: progress?.processing || 0,
    sent: progress?.sent || 0,
    failed: progress?.failed || 0,
    cancelled: progress?.cancelled || 0,
    total: progress?.total || 0,
    is_active: ((progress?.pending || 0) + (progress?.processing || 0)) > 0,
  });
}

async function processUserQueue(userId) {
  const settings = loadSettings();
  const sessionsTotal = 3;
  let totalSent = 0;
  let totalFailed = 0;

  console.log(`[Queue:${userId}] Starting per-user queue (sessions=${sessionsTotal}, per_session=${settings.messages_per_session}, delay=${settings.min_delay_sec}-${settings.max_delay_sec}s)`);

  for (let session = 0; session < sessionsTotal; session++) {
    let sentThisSession = 0;
    let restCounter = 0;

    console.log(`[Queue:${userId}] Session ${session + 1}/${sessionsTotal} starting`);

    while (sentThisSession < settings.messages_per_session) {
      if (!running) {
        console.log(`[Queue:${userId}] Queue stopped, aborting`);
        return { sent: totalSent, failed: totalFailed };
      }

      if (!isConnectedForUser(userId)) {
        console.log(`[Queue:${userId}] WA disconnected, pausing queue`);
        return { sent: totalSent, failed: totalFailed };
      }

      const db = getWritableDb();
      const row = db.prepare(`
        SELECT bh.id, bh.customer_id, bh.exact_message, bh.retry_count, c.phone_number
        FROM broadcast_histories bh
        JOIN customers c ON c.id = bh.customer_id
        WHERE bh.status = 'pending' AND bh.marketing_id = ?
        ORDER BY bh.id ASC
        LIMIT 1
      `).get(userId);

      if (!row) {
        console.log(`[Queue:${userId}] No more pending messages`);
        return { sent: totalSent, failed: totalFailed };
      }

      const cancelled = db.prepare('SELECT status FROM broadcast_histories WHERE id = ?').get(row.id);
      if (cancelled && cancelled.status === 'cancelled') {
        console.log(`[Queue:${userId}] Skipping cancelled #${row.id}`);
        continue;
      }

      db.prepare("UPDATE broadcast_histories SET status = 'processing', updated_at = datetime('now') WHERE id = ?").run(row.id);
      emitBroadcastStatus(userId, { customer_id: row.customer_id, status: 'processing' });

      const lastConn = lastConnectedAt.get(userId) || 0;
      const elapsed = Date.now() - lastConn;
      if (elapsed < WARMUP_GRACE_MS) {
        const extraDelay = WARMUP_GRACE_MS - elapsed;
        console.log(`[Queue:${userId}] Warmup delay ${extraDelay}ms`);
        await sleep(extraDelay);
      }

      try {
        const raw = row.phone_number.replace(/[^0-9]/g, '');
        const normalized = raw.startsWith('0') ? '62' + raw.slice(1) : raw;
        const jid = `${normalized}@s.whatsapp.net`;
        await sendMessage(userId, jid, row.exact_message);

        totalSent++;
        sentThisSession++;
        restCounter++;
        db.prepare("UPDATE broadcast_histories SET status = 'sent', sent_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND status = 'processing'").run(row.id);
        emitBroadcastStatus(userId, { customer_id: row.customer_id, status: 'sent' });
        console.log(`[Queue:${userId}] Sent #${row.id} to ${row.phone_number} (session ${session + 1}: ${sentThisSession}/${settings.messages_per_session})`);
      } catch (err) {
        const errMsg = err.message || 'Unknown error';
        const currentRetry = row.retry_count || 0;

        if (currentRetry < settings.max_retry) {
          db.prepare("UPDATE broadcast_histories SET status = 'pending', retry_count = ?, error_log = ?, updated_at = datetime('now') WHERE id = ? AND status = 'processing'")
            .run(currentRetry + 1, errMsg, row.id);
          console.warn(`[Queue:${userId}] Failed #${row.id} (retry ${currentRetry + 1}/${settings.max_retry}): ${errMsg}`);
        } else {
          totalFailed++;
          db.prepare("UPDATE broadcast_histories SET status = 'failed', error_log = ?, updated_at = datetime('now') WHERE id = ? AND status = 'processing'")
            .run(errMsg, row.id);
          emitBroadcastStatus(userId, { customer_id: row.customer_id, status: 'failed', error: errMsg });
          console.error(`[Queue:${userId}] Failed #${row.id} (max retries): ${errMsg}`);
        }
      }

      emitUserProgress(getWritableDb(), userId);
      emitBroadcastGlobalStatus();

      if (restCounter >= settings.rest_every_x_messages && sentThisSession < settings.messages_per_session) {
        const restDuration = randomBetween(settings.rest_duration_min_sec, settings.rest_duration_max_sec);
        console.log(`[Queue:${userId}] Rest after ${restCounter} messages: ${restDuration}s`);
        await sleep(restDuration * 1000);
        restCounter = 0;
      } else if (sentThisSession < settings.messages_per_session) {
        const delay = settings.random_delay
          ? randomBetween(settings.min_delay_sec, settings.max_delay_sec)
          : settings.min_delay_sec;
        await sleep(delay * 1000);
      }
    }

    console.log(`[Queue:${userId}] Session ${session + 1} complete (${sentThisSession} sent)`);

    if (session < sessionsTotal - 1) {
      const breakDuration = randomBetween(settings.session_break_min_sec, settings.session_break_max_sec);
      console.log(`[Queue:${userId}] Session break: ${breakDuration}s (${Math.floor(breakDuration / 60)}m ${breakDuration % 60}s)`);
      await sleep(breakDuration * 1000);
    }
  }

  console.log(`[Queue:${userId}] All ${sessionsTotal} sessions complete (${totalSent} sent, ${totalFailed} failed)`);
  return { sent: totalSent, failed: totalFailed };
}

async function pollAndDispatch() {
  if (activeProcessors.size > 0) return;

  const settings = loadSettings();
  if (!settings.queue_enabled) return;

  const db = getWritableDb();
  const usersWithPending = db.prepare(`
    SELECT DISTINCT marketing_id FROM broadcast_histories WHERE status = 'pending'
  `).all();

  if (usersWithPending.length === 0) return;

  const connectedUsers = getConnectedUsers();
  let dispatched = 0;

  for (const { marketing_id } of usersWithPending) {
    if (dispatched >= settings.concurrency) break;
    if (activeProcessors.has(marketing_id)) continue;
    if (!connectedUsers.includes(marketing_id)) continue;

    activeProcessors.set(marketing_id, true);
    dispatched++;

    processUserQueue(marketing_id)
      .then((result) => {
        if (result.sent > 0 || result.failed > 0) {
          sendPushNotification(marketing_id, 'Broadcast Selesai', `${result.sent} terkirim, ${result.failed} gagal`);
        }
        emitUserProgress(getWritableDb(), marketing_id);
        emitBroadcastGlobalStatus();
      })
      .catch((err) => {
        console.error(`[Queue:${marketing_id}] Fatal error:`, err.message);
      })
      .finally(() => {
        activeProcessors.delete(marketing_id);
      });
  }
}

function startQueue() {
  if (running) return;
  running = true;
  const settings = loadSettings();
  console.log(`[Queue] Started (poll every ${POLL_INTERVAL}ms, queue_enabled=${settings.queue_enabled}, concurrency=${settings.concurrency})`);
  pollIntervalId = setInterval(pollAndDispatch, POLL_INTERVAL);

  notifIntervalId = setInterval(() => {
    try {
      const db = getWritableDb();
      const rows = db.prepare(`
        SELECT user_id, MAX(id) as max_id
        FROM notifications
        WHERE read_at IS NULL
        GROUP BY user_id
      `).all();

      for (const row of rows) {
        const prevMax = lastNotifId.get(row.user_id) || 0;
        if (row.max_id > prevMax) {
          emitNotificationNew(row.user_id, { user_id: row.user_id });
          lastNotifId.set(row.user_id, row.max_id);
        }
      }
    } catch {
      // silent
    }
  }, NOTIF_POLL_INTERVAL);
}

function stopQueue() {
  running = false;
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
  if (notifIntervalId) {
    clearInterval(notifIntervalId);
    notifIntervalId = null;
  }
  console.log('[Queue] Stopped');
}

module.exports = { startQueue, stopQueue };
