const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const { Server } = require('socket.io');
const { getOrCreateClient, disconnect, requestPairingCode, softReset } = require('./wa-manager');
const { isConnectedForUser } = require('./wa-client');
const { setIO } = require('./events');

const DB_PATH = path.resolve(process.env.DB_PATH || path.resolve(__dirname, '..', '..', 'backend', 'database', 'database.sqlite'));

const COOLDOWN_MS = 60_000;

let io = null;
const lastAttempt = new Map();

let readonlyDb = null;
function getReadonlyDb() {
  if (!readonlyDb) {
    readonlyDb = new Database(DB_PATH, { readonly: true });
    readonlyDb.pragma('busy_timeout = 5000');
  }
  return readonlyDb;
}

function checkCooldown(userId) {
  const last = lastAttempt.get(userId) || 0;
  const elapsed = Date.now() - last;
  if (elapsed < COOLDOWN_MS) {
    return Math.ceil((COOLDOWN_MS - elapsed) / 1000);
  }
  return 0;
}

function recordAttempt(userId) {
  lastAttempt.set(userId, Date.now());
}

function validateToken(token) {
  if (!token || !token.includes('|')) return null;

  const parts = token.split('|');
  const tokenId = parseInt(parts[0], 10);
  const secret = parts.slice(1).join('|');

  if (!tokenId || !secret) return null;

  const hash = crypto.createHash('sha256').update(secret).digest('hex');

  try {
    const db = getReadonlyDb();
    const row = db.prepare('SELECT tokenable_id FROM personal_access_tokens WHERE id = ? AND token = ?').get(tokenId, hash);
    if (!row) return null;
    const userRow = db.prepare('SELECT id, role FROM users WHERE id = ?').get(row.tokenable_id);
    return userRow ? { userId: userRow.id, role: userRow.role } : null;
  } catch (err) {
    console.error('[Socket] Token validation error:', err.message);
    return null;
  }
}

function getWAStatusFromDB(userId) {
  try {
    const db = getReadonlyDb();
    const row = db.prepare('SELECT status, qr_code FROM whatsapp_connections WHERE user_id = ?').get(userId);
    return row || null;
  } catch (err) {
    return null;
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
    socket.data.role = result.role;
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    const userRole = socket.data.role;
    const room = `user:${userId}`;
    socket.join(room);

    if (userRole === 'superadmin') {
      socket.join('superadmin_monitor');
      socket.join('broadcast_monitor');
      console.log(`[Socket] Superadmin ${userId} joined superadmin_monitor + broadcast_monitor room`);
    } else if (userRole === 'UH') {
      socket.join('broadcast_monitor');
      console.log(`[Socket] UH ${userId} joined broadcast_monitor room`);
    }

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
      const waitSec = checkCooldown(userId);
      if (waitSec > 0) {
        socket.emit('wa:status', { status: 'reconnecting', message: `Tunggu ${waitSec} detik sebelum coba lagi...` });
        return;
      }
      recordAttempt(userId);
      try {
        const dbStatus = getWAStatusFromDB(userId);
        const isRetry = dbStatus && (dbStatus.status === 'awaiting_scan' || dbStatus.status === 'connected');
        if (isRetry) {
          console.log(`[Socket] Retrying connection for user ${userId} (keeping auth)`);
          softReset(userId);
        } else {
          await disconnect(userId);
        }
        socket.emit('wa:status', { status: 'reconnecting', message: 'Menyiapkan koneksi...' });
        await new Promise((r) => setTimeout(r, 200));
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
      const waitSec = checkCooldown(userId);
      if (waitSec > 0) {
        socket.emit('wa:pairing_code', { error: `Tunggu ${waitSec} detik sebelum coba lagi...` });
        return;
      }
      recordAttempt(userId);
      try {
        if (isConnectedForUser(userId)) {
          socket.emit('wa:pairing_code', { error: 'WhatsApp sudah terhubung' });
          return;
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

function closeReadonlyDb() {
  if (readonlyDb) {
    try { readonlyDb.close(); } catch {}
    readonlyDb = null;
  }
}

module.exports = { createSocketServer, getIO, closeReadonlyDb };
