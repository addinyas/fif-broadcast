const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const { Server } = require('socket.io');
const { getOrCreateClient, disconnect, requestPairingCode, softReset } = require('./wa-manager');
const { isConnectedForUser } = require('./wa-client');
const { setIO } = require('./events');

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
    db.pragma('busy_timeout = 5000');
    const row = db.prepare('SELECT tokenable_id FROM personal_access_tokens WHERE id = ? AND token = ?').get(tokenId, hash);
    return row ? { userId: row.tokenable_id } : null;
  } catch (err) {
    console.error('[Socket] Token validation error:', err.message);
    return null;
  } finally {
    if (db) db.close();
  }
}

function getWAStatusFromDB(userId) {
  let db;
  try {
    db = new Database(DB_PATH, { readonly: true });
    db.pragma('busy_timeout = 5000');
    const row = db.prepare('SELECT status, qr_code FROM whatsapp_connections WHERE user_id = ?').get(userId);
    return row || null;
  } catch (err) {
    return null;
  } finally {
    if (db) db.close();
  }
}

function createSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: ['https://fif-broadcast.net', 'https://www.fif-broadcast.net', 'http://localhost:5173'],
      methods: ['GET', 'POST'],
    },
  });

  setIO(io);

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

    if (isConnectedForUser(userId)) {
      socket.emit('wa:status', { status: 'connected', message: 'WhatsApp connected' });
    } else {
      const dbStatus = getWAStatusFromDB(userId);
      if (dbStatus && dbStatus.status === 'connected') {
        socket.emit('wa:status', { status: 'connected', message: 'WhatsApp connected' });
      } else if (dbStatus && dbStatus.status === 'awaiting_scan' && dbStatus.qr_code) {
        socket.emit('wa:status', { status: 'awaiting_scan', message: 'Scan QR dengan WhatsApp Anda', qr: dbStatus.qr_code });
      } else {
        socket.emit('wa:status', { status: 'disconnected', message: 'Menunggu koneksi...' });
      }
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
        const dbStatus = getWAStatusFromDB(userId);
        const isRetry = dbStatus && (dbStatus.status === 'awaiting_scan' || dbStatus.status === 'connected');
        if (isRetry) {
          console.log(`[Socket] Retrying connection for user ${userId} (keeping auth)`);
          softReset(userId);
        } else {
          await disconnect(userId);
        }
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

    socket.on('wa:request_status', () => {
      if (isConnectedForUser(userId)) {
        socket.emit('wa:status', { status: 'connected', message: 'WhatsApp connected' });
      } else {
        const dbStatus = getWAStatusFromDB(userId);
        if (dbStatus && dbStatus.status === 'connected') {
          socket.emit('wa:status', { status: 'connected', message: 'WhatsApp connected' });
        } else if (dbStatus && dbStatus.status === 'awaiting_scan' && dbStatus.qr_code) {
          socket.emit('wa:status', { status: 'awaiting_scan', message: 'Scan QR dengan WhatsApp Anda', qr: dbStatus.qr_code });
        } else {
          socket.emit('wa:status', { status: 'disconnected', message: 'Menunggu koneksi...' });
        }
      }
    });

    socket.on('wa:request_pairing_code', async (data) => {
      const phoneNumber = data?.phoneNumber;
      if (!phoneNumber || !/^\d+$/.test(phoneNumber)) {
        socket.emit('wa:pairing_code', { error: 'Nomor telepon tidak valid' });
        return;
      }
      try {
        if (!isConnectedForUser(userId)) {
          await new Promise((resolve) => {
            getOrCreateClient(userId, resolve).catch(() => resolve());
            setTimeout(resolve, 15000);
          });
        }
        await requestPairingCode(userId, phoneNumber);
      } catch (err) {
        console.error(`[Socket] Pairing code error for user ${userId}:`, err.message);
        socket.emit('wa:pairing_code', { error: err.message });
      }
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { createSocketServer, getIO };
