let io = null;

function setIO(socketIO) {
  io = socketIO;
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

module.exports = { setIO, emitWAStatus, emitBroadcastStatus, emitPendingStuck, emitPairingCode, emitNotificationNew, emitBroadcastProgress, emitGlobalWAStatus, emitBroadcastGlobalStatus };
