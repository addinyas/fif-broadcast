let io = null;

const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || '';

function setIO(socketIO) {
  io = socketIO;
}

async function sendPushNotification(userId, title, body) {
  if (!FCM_SERVER_KEY) return;
  try {
    const { getOne } = require('./db');
    const user = await getOne('SELECT fcm_token FROM users WHERE id = $1', [userId]);
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

async function saveNotification(userId, type, title, message, data) {
  try {
    const { pool } = require('./db');
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, message, data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
      [userId, type, title, message, data ? JSON.stringify(data) : null]
    );
  } catch (err) {
    console.error(`[Notif] Failed to save notification for user ${userId}:`, err.message);
  }
}

function emitWAStatus(userId, data) {
  if (io) {
    io.to(`user:${userId}`).emit('wa:status', data);
  }
}

function emitBroadcastStatus(userId, data) {
  if (io) {
    io.to(`user:${userId}`).emit('broadcast:status', data);
  }
}

function emitPendingStuck(userId, data) {
  if (io) {
    io.to(`user:${userId}`).emit('broadcast:pending_stuck', data);
  }
}

function emitPairingCode(userId, data) {
  if (io) {
    io.to(`user:${userId}`).emit('wa:pairing_code', data);
  }
}

function emitNotificationNew(userId, data) {
  if (io) {
    io.to(`user:${userId}`).emit('notification:new', data);
  }
}

function emitInboxNew(userId, data) {
  if (io) {
    io.to(`user:${userId}`).emit('inbox:new', data);
  }
}

function emitBroadcastProgress(userId, data) {
  if (io) {
    io.to(`user:${userId}`).emit('broadcast:progress', data);
  }
}

function emitGlobalWAStatus(userId, data) {
  if (io) {
    io.to('superadmin_monitor').emit('wa:global_status', { userId, ...data });
  }
}

async function emitBroadcastGlobalStatus() {
  if (!io) return;
  try {
    const { getOne } = require('./db');
    const row = await getOne(`
      SELECT
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as total_pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as total_processing,
        SUM(CASE WHEN status = 'sent' AND date(sent_at) = CURRENT_DATE THEN 1 ELSE 0 END) as total_sent_today,
        SUM(CASE WHEN status = 'failed' AND date(updated_at) = CURRENT_DATE THEN 1 ELSE 0 END) as total_failed_today
      FROM broadcast_histories
    `);
    io.to('broadcast_monitor').emit('broadcast:global_status', row || { total_pending: 0, total_processing: 0, total_sent_today: 0, total_failed_today: 0 });
  } catch {
    // silent — non-critical
  }
}

module.exports = { setIO, emitWAStatus, emitBroadcastStatus, emitPendingStuck, emitPairingCode, emitNotificationNew, emitInboxNew, emitBroadcastProgress, emitGlobalWAStatus, emitBroadcastGlobalStatus, sendPushNotification, saveNotification };
