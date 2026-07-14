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

module.exports = { setIO, emitWAStatus, emitBroadcastStatus, emitPendingStuck, emitPairingCode, emitNotificationNew };
