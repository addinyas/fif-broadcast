const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const { emitWAStatus } = require('./socket-server');

const AUTH_BASE = path.resolve(__dirname, '..', 'auth_info');
const DB_PATH = path.resolve(process.env.DB_PATH || path.resolve(__dirname, '..', '..', 'backend', 'database', 'database.sqlite'));

const MAX_CONNECTION_MS = (parseInt(process.env.MAX_CONNECTION_HOURS || '8', 10)) * 60 * 60 * 1000;

const connections = new Map();
const reconnectState = new Map();

function getAuthDir(userId) {
  return path.join(AUTH_BASE, `user_${userId}`);
}

function ensureAuthDir(userId) {
  const dir = getAuthDir(userId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function saveConnectionStatus(userId, status, qrCode) {
  let db;
  try {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    const existing = db.prepare('SELECT id FROM whatsapp_connections WHERE user_id = ?').get(userId);
    if (existing) {
      db.prepare('UPDATE whatsapp_connections SET status = ?, qr_code = ?, updated_at = datetime(\'now\') WHERE user_id = ?').run(status, qrCode || null, userId);
    } else {
      db.prepare('INSERT INTO whatsapp_connections (user_id, status, qr_code, created_at, updated_at) VALUES (?, ?, ?, datetime(\'now\'), datetime(\'now\'))').run(userId, status, qrCode || null);
    }
  } catch (err) {
    console.error(`[WA] Failed to save connection status for user ${userId}:`, err.message);
  } finally {
    if (db) db.close();
  }
}

async function createWAClientForUser(userId, onReady) {
  const authDir = getAuthDir(userId);
  ensureAuthDir(userId);

  if (!reconnectState.has(userId)) {
    reconnectState.set(userId, { attempts: 0, reconnecting: false });
  }
  const rs = reconnectState.get(userId);
  let sock = null;

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    syncFullHistory: false,
    emitOwnEvents: false,
    browser: ['FIF Broadcast', 'Chrome', '1.0.0'],
    markOnlineOnConnect: false,
    connectTimeoutMs: 60_000,
    keepAliveIntervalMs: 25_000,
  });

  connections.set(userId, { sock });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      saveConnectionStatus(userId, 'awaiting_scan', qr);
      emitWAStatus(userId, { status: 'awaiting_scan', message: 'Scan QR dengan WhatsApp Anda', qr });
    }

    if (connection === 'open') {
      console.log(`[WA] User ${userId} connected successfully!`);
      rs.attempts = 0;
      rs.reconnecting = false;
      const entry = connections.get(userId);
      if (entry) {
        entry.connected = true;
        entry.connectedAt = Date.now();
        entry.intentionalDisconnect = false;

        if (entry.disconnectTimer) clearTimeout(entry.disconnectTimer);
        entry.disconnectTimer = setTimeout(() => {
          console.log(`[WA] User ${userId} auto-disconnect after ${MAX_CONNECTION_MS / 3600000}h`);
          const e = connections.get(userId);
          if (e) {
            e.intentionalDisconnect = true;
            if (e.sock) {
              try { e.sock.ev.removeAllListeners('connection.update'); } catch {}
              try { e.sock.end(undefined); } catch {}
            }
          }
          connections.delete(userId);
          reconnectState.delete(userId);
          const authDir = getAuthDir(userId);
          if (fs.existsSync(authDir)) {
            fs.rmSync(authDir, { recursive: true, force: true });
          }
          saveConnectionStatus(userId, 'logged_out', null);
          emitWAStatus(userId, { status: 'logged_out', message: 'WhatsApp disconnected (8h timeout)' });
        }, MAX_CONNECTION_MS);
      }
      saveConnectionStatus(userId, 'connected', null);
      emitWAStatus(userId, { status: 'connected', message: 'WhatsApp connected' });
      if (onReady) onReady(sock);
    }

    if (connection === 'close') {
      const entry = connections.get(userId);
      if (entry) {
        if (entry.intentionalDisconnect) {
          console.log(`[WA] User ${userId} intentional disconnect (auto-timer), skipping reconnect`);
          entry.connected = false;
          return;
        }
        entry.connected = false;
        if (entry.disconnectTimer) {
          clearTimeout(entry.disconnectTimer);
          entry.disconnectTimer = null;
        }
      }

      const isLoggedOut = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;
      console.log(`[WA] User ${userId} disconnected. loggedOut: ${isLoggedOut}, reconnectAttempts: ${rs.attempts}`);

      if (isLoggedOut) {
        console.log(`[WA] User ${userId} logged out.`);
        rs.reconnecting = false;
        try { sock.end(undefined); } catch {}
        connections.delete(userId);
        reconnectState.delete(userId);
        saveConnectionStatus(userId, 'logged_out', null);
        emitWAStatus(userId, { status: 'logged_out', message: 'WhatsApp logged out' });
        return;
      }

      if (rs.reconnecting) return;

      rs.reconnecting = true;
      rs.attempts++;
      const delay = Math.min(1000 * Math.pow(2, Math.min(rs.attempts, 5)), 30000);
      console.log(`[WA] User ${userId} reconnecting in ${delay}ms (attempt ${rs.attempts})`);
      try { sock.end(undefined); } catch {}
      setTimeout(() => {
        rs.reconnecting = false;
        createWAClientForUser(userId, onReady).catch((err) => {
          console.error(`[WA] Reconnect failed for user ${userId}:`, err.message);
        });
      }, delay);
    }
  });

  sock.ev.on('messages.upsert', () => {});

  return sock;
}

async function sendWAMessageForUser(userId, jid, text) {
  const entry = connections.get(userId);
  if (!entry || !entry.sock) throw new Error('WA client not found for user');
  if (!entry.connected) throw new Error('WA connection not open for user');

  const sock = entry.sock;
  const result = await sock.sendMessage(jid, { text });
  return result;
}

async function disconnectWAForUser(userId) {
  const entry = connections.get(userId);
  if (entry) {
    if (entry.disconnectTimer) {
      clearTimeout(entry.disconnectTimer);
      entry.disconnectTimer = null;
    }
    if (entry.sock) {
      try {
        // Prevent reconnect loop by detaching listeners before ending
        entry.sock.ev.removeAllListeners('connection.update');
        entry.sock.end(undefined);
      } catch (e) {
        console.error(`[WA] Error ending socket for user ${userId}:`, e.message);
      }
    }
  }
  connections.delete(userId);

  const authDir = getAuthDir(userId);
  if (fs.existsSync(authDir)) {
    try {
      fs.rmSync(authDir, { recursive: true, force: true });
      console.log(`[WA] Cleared auth session for user ${userId}`);
    } catch (e) {
      console.error(`[WA] Failed to clear auth session for user ${userId}:`, e.message);
    }
  }

  saveConnectionStatus(userId, 'logged_out', null);
  emitWAStatus(userId, { status: 'logged_out', message: 'WhatsApp disconnected' });
}

function isConnectedForUser(userId) {
  const entry = connections.get(userId);
  return entry ? !!entry.connected : false;
}

function getConnectedUsers() {
  const connected = [];
  for (const [userId, entry] of connections) {
    if (entry.connected) connected.push(userId);
  }
  return connected;
}

module.exports = { createWAClientForUser, sendWAMessageForUser, disconnectWAForUser, isConnectedForUser, getConnectedUsers };
