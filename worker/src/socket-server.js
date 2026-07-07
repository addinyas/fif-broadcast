const { Server } = require('socket.io');

let io = null;
let onDisconnectRequest = null;
let lastWAStatus = null;

function createSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    if (lastWAStatus) {
      socket.emit('wa:status', lastWAStatus);
    }

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });

    socket.on('wa:disconnect', () => {
      console.log('[Socket] Disconnect request received');
      if (onDisconnectRequest) onDisconnectRequest();
    });
  });

  return io;
}

function setOnDisconnectRequest(handler) {
  onDisconnectRequest = handler;
}

function getIO() {
  return io;
}

function emitBroadcastStatus(data) {
  if (io) {
    io.emit('broadcast:status', data);
  }
}

function emitWAStatus(data) {
  lastWAStatus = data;
  if (io) {
    io.emit('wa:status', data);
  }
}

function clearLastWAStatus() {
  lastWAStatus = null;
}

module.exports = { createSocketServer, getIO, emitBroadcastStatus, emitWAStatus, setOnDisconnectRequest, clearLastWAStatus };
