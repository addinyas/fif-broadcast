const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const Database = require('better-sqlite3');

const DB_PATH = path.resolve(process.env.DB_PATH || path.resolve(__dirname, '..', '..', 'backend', 'database', 'database.sqlite'));

let io = null;

function validateToken(token) {
  if (!token || !token.includes('|')) return null;

  const parts = token.split('|');
  const tokenId = parseInt(parts[0], 10);
  const secret = parts.slice(1).join('|');

  if (!tokenId || !secret) return null;

  const hash = crypto.createHash('sha256').update(secret).digest('hex');

  let db;
  try {
    db = new Database(DB_PATH, { readonly: true });
    const row = db.prepare('SELECT tokenable_id FROM personal_access_tokens WHERE id = ? AND token = ?').get(tokenId, hash);
    return row ? { userId: row.tokenable_id } : null;
  } catch (err) {
    console.error('[Socket] Token validation error:', err.message);
    return null;
  } finally {
    if (db) db.close();
  }
}

function createSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const result = validateToken(token);
    if (!result) {
      return next(new Error('Invalid token'));
    }

    socket.data.userId = result.userId;
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    const room = `user:${userId}`;
    socket.join(room);

    console.log(`[Socket] User ${userId} connected (socket ${socket.id})`);

    const { getOrCreateClient, disconnect } = require('./wa-manager');
    const { isConnectedForUser } = require('./wa-client');

    if (isConnectedForUser(userId)) {
      socket.emit('wa:status', { status: 'connected', message: 'WhatsApp connected' });
    } else {
      socket.emit('wa:status', { status: 'disconnected', message: 'Menghubungkan...' });
      getOrCreateClient(userId, () => {
        console.log(`[Socket] WA client ready for user ${userId}`);
      }).catch((err) => {
        console.error(`[Socket] Failed to create WA client for user ${userId}:`, err.message);
      });
    }

    socket.on('disconnect', () => {
      console.log(`[Socket] User ${userId} disconnected (socket ${socket.id})`);
    });

    socket.on('wa:disconnect', () => {
      console.log(`[Socket] Disconnect request from user ${userId}`);
      disconnect(userId);
    });

    socket.on('wa:reconnect', async () => {
      console.log(`[Socket] Reconnect request from user ${userId}`);
      try {
        disconnect(userId);
        await new Promise((r) => setTimeout(r, 500));
        getOrCreateClient(userId, () => {
          console.log(`[Socket] WA client re-created for user ${userId}`);
        }).catch((err) => {
          console.error(`[Socket] Failed to re-create WA client for user ${userId}:`, err.message);
        });
      } catch (err) {
        console.error(`[Socket] Reconnect error for user ${userId}:`, err.message);
      }
    });
  });

  return io;
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

module.exports = { createSocketServer, emitWAStatus, emitBroadcastStatus, emitPendingStuck };
