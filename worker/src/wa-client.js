const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const { emitWAStatus, emitPairingCode, emitGlobalWAStatus } = require('./events');

const AUTH_BASE = path.resolve(__dirname, '..', 'auth_info');
const DB_PATH = path.resolve(process.env.DB_PATH || path.resolve(__dirname, '..', '..', 'backend', 'database', 'database.sqlite'));

const MAX_RECONNECT_ATTEMPTS = 10;
const WARMUP_MS = 3000 + Math.floor(Math.random() * 2000);

const WA_PROXY_FALLBACK = process.env.WA_PROXY || '';

function getUserProxy(userId) {
  let db;
  try {
    db = new Database(DB_PATH, { readonly: true });
    db.pragma('busy_timeout = 5000');
    const row = db.prepare('SELECT wa_proxy FROM users WHERE id = ?').get(userId);
    return row?.wa_proxy || null;
  } catch (err) {
    console.error(`[WA] Failed to read proxy for user ${userId}:`, err.message);
    return null;
  } finally {
    if (db) db.close();
  }
}

function resolveProxyAgent(proxyUrl) {
  if (!proxyUrl) return { proxyAgent: undefined, fetchAgent: undefined };
  if (proxyUrl.startsWith('socks')) {
    const { SocksProxyAgent } = require('socks-proxy-agent');
    const agent = new SocksProxyAgent(proxyUrl);
    return { proxyAgent: agent, fetchAgent: agent };
  } else {
    const { HttpsProxyAgent } = require('https-proxy-agent');
    const agent = new HttpsProxyAgent(proxyUrl);
    return { proxyAgent: agent, fetchAgent: agent };
  }
}

const connections = new Map();
const reconnectState = new Map();
const lastConnectedAt = new Map();

function getAuthDir(userId) {
  return path.join(AUTH_BASE, `user_${userId}`);
}

function ensureAuthDir(userId) {
  const dir = getAuthDir(userId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function cleanupOldLidFiles() {
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  const now = Date.now();
  try {
    if (!fs.existsSync(AUTH_BASE)) return;
    const entries = fs.readdirSync(AUTH_BASE, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dirPath = path.join(AUTH_BASE, entry.name);
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (!file.endsWith('.lid')) continue;
        const filePath = path.join(dirPath, file);
        try {
          const stat = fs.statSync(filePath);
          if (now - stat.mtimeMs > maxAge) {
            fs.unlinkSync(filePath);
            console.log(`[WA] Cleaned old LID file: ${filePath}`);
          }
        } catch {}
      }
    }
  } catch (err) {
    console.error('[WA] Error cleaning LID files:', err.message);
  }
}

function saveConnectionStatus(userId, status, qrCode) {
  let db;
  try {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
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

  // Per-user proxy: DB > env fallback
  const userProxy = getUserProxy(userId) || WA_PROXY_FALLBACK;
  let userProxyAgent = undefined;
  let userFetchAgent = undefined;
  if (userProxy) {
    const resolved = resolveProxyAgent(userProxy);
    userProxyAgent = resolved.proxyAgent;
    userFetchAgent = resolved.fetchAgent;
    console.log(`[WA] User ${userId} using proxy: ${userProxy}`);
  }

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    syncFullHistory: false,
    emitOwnEvents: false,
    browser: ['WhatsApp', 'Chrome', '120.0.0.0'],
    platform: 'Desktop',
    markOnlineOnConnect: false,
    connectTimeoutMs: 60_000,
    keepAliveIntervalMs: 180_000 + Math.floor(Math.random() * 120_000),
    ...(userProxyAgent ? { agent: userProxyAgent, fetchAgent: userFetchAgent } : {}),
  });

  const wsReadyPromise = new Promise((resolve) => {
    let resolved = false;
    const check = (update) => {
      if (resolved) return;
      const { connection, qr } = update;
      if (connection === 'open') {
        resolved = true;
        sock.ev.off('connection.update', check);
        resolve(true);
        return;
      }
      if (qr) {
        resolved = true;
        sock.ev.off('connection.update', check);
        resolve(true);
        return;
      }
      if (connection === 'close') {
        resolved = true;
        sock.ev.off('connection.update', check);
        resolve(false);
        return;
      }
    };
    sock.ev.on('connection.update', check);
    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      sock.ev.off('connection.update', check);
      console.log(`[WA] User ${userId} WS ready timeout`);
      resolve(false);
    }, 8_000);
  });

  connections.set(userId, { sock, wsReadyPromise });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      saveConnectionStatus(userId, 'awaiting_scan', qr);
      emitWAStatus(userId, { status: 'awaiting_scan', message: 'Scan QR dengan WhatsApp Anda', qr });
      emitGlobalWAStatus(userId, { status: 'awaiting_scan', message: 'Scan QR dengan WhatsApp Anda' });
    }

    if (connection === 'open') {
      console.log(`[WA] User ${userId} connected successfully!`);
      rs.attempts = 0;
      rs.reconnecting = false;
      lastConnectedAt.set(userId, Date.now());
      const entry = connections.get(userId);
      if (entry) {
        entry.connected = true;
        entry.connectedAt = Date.now();
        entry.intentionalDisconnect = false;
      }
      saveConnectionStatus(userId, 'connected', null);
      emitWAStatus(userId, { status: 'connected', message: 'WhatsApp connected' });
      emitGlobalWAStatus(userId, { status: 'connected', message: 'WhatsApp connected' });
      setTimeout(() => {
        if (onReady) onReady(sock);
      }, WARMUP_MS);
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

      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      const isTimedOut = statusCode === DisconnectReason.timedOut;
      console.log(`[WA] User ${userId} disconnected. loggedOut: ${isLoggedOut}, timedOut: ${isTimedOut}, reconnectAttempts: ${rs.attempts}`);

      if (isLoggedOut) {
        console.log(`[WA] User ${userId} logged out.`);
        rs.reconnecting = false;
        try { sock.end(undefined); } catch {}
        connections.delete(userId);
        reconnectState.delete(userId);
        saveConnectionStatus(userId, 'logged_out', null);
        emitWAStatus(userId, { status: 'logged_out', message: 'WhatsApp logged out' });
        emitGlobalWAStatus(userId, { status: 'logged_out', message: 'WhatsApp logged out' });
        return;
      }

      if (isTimedOut) {
        console.log(`[WA] User ${userId} connection timed out (QR/pairing expired), waiting for user action`);
        rs.reconnecting = false;
        rs.attempts = 0;
        try { sock.end(undefined); } catch {}
        connections.delete(userId);
        reconnectState.delete(userId);
        saveConnectionStatus(userId, 'awaiting_scan', null);
        emitWAStatus(userId, { status: 'awaiting_scan', message: 'Koneksi expired — silakan coba lagi' });
        emitGlobalWAStatus(userId, { status: 'awaiting_scan', message: 'Koneksi expired — silakan coba lagi' });
        return;
      }

      if (rs.reconnecting) return;

      rs.reconnecting = true;
      rs.attempts++;

      if (rs.attempts > MAX_RECONNECT_ATTEMPTS) {
        console.log(`[WA] User ${userId} max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached, giving up`);
        rs.reconnecting = false;
        try { sock.end(undefined); } catch {}
        connections.delete(userId);
        reconnectState.delete(userId);
        saveConnectionStatus(userId, 'logged_out', null);
        emitWAStatus(userId, { status: 'logged_out', message: 'Reconnect gagal, silakan scan QR ulang' });
        emitGlobalWAStatus(userId, { status: 'logged_out', message: 'Reconnect gagal, silakan scan QR ulang' });
        return;
      }

      const delay = Math.min(1000 * Math.pow(2, Math.min(rs.attempts, 5)), 30000);
      console.log(`[WA] User ${userId} reconnecting in ${delay}ms (attempt ${rs.attempts})`);
      emitWAStatus(userId, { status: 'reconnecting', message: 'Menghubungkan kembali...' });
      emitGlobalWAStatus(userId, { status: 'reconnecting', message: 'Menghubungkan kembali...' });
      try { sock.end(undefined); } catch {}
      setTimeout(() => {
        rs.reconnecting = false;
        createWAClientForUser(userId, onReady).catch((err) => {
          console.error(`[WA] Reconnect failed for user ${userId}:`, err.message);
        });
      }, delay);
    }
  });

  return sock;
}

async function sendWAMessageForUser(userId, jid, text) {
  const entry = connections.get(userId);
  if (!entry || !entry.sock) throw new Error('WA client not found for user');
  if (!entry.connected) throw new Error('WA connection not open for user');

  const sock = entry.sock;
  try { await sock.sendPresenceUpdate('composing', jid); } catch {}
  const typingDelay = 2000 + Math.floor(Math.random() * 6000);
  await new Promise((r) => setTimeout(r, typingDelay));
  const result = await sock.sendMessage(jid, { text });
  return result;
}

async function requestPairingCodeForUser(userId, phoneNumber) {
  const entry = connections.get(userId);
  if (entry && entry.sock && !entry.connected) {
    const ready = await entry.wsReadyPromise;
    if (ready) {
      const code = await entry.sock.requestPairingCode(phoneNumber);
      console.log(`[WA] Pairing code for user ${userId}: ${code}`);
      emitPairingCode(userId, { code, message: `Masukkan kode ${code} di WhatsApp Anda` });
      return code;
    }
    throw new Error('WhatsApp socket belum terbuka. Coba hubungkan ulang.');
  }

  console.log(`[WA] No active client for user ${userId}, creating new one for pairing...`);
  await createWAClientForUser(userId, null);

  const newEntry = connections.get(userId);
  if (!newEntry || !newEntry.sock) {
    throw new Error('Gagal membuat koneksi WhatsApp. Coba lagi.');
  }

  const ready = await newEntry.wsReadyPromise;
  if (!ready) {
    throw new Error('WhatsApp socket belum terbuka. Coba hubungkan ulang.');
  }

  const code = await newEntry.sock.requestPairingCode(phoneNumber);
  console.log(`[WA] Pairing code for user ${userId}: ${code}`);
  emitPairingCode(userId, { code, message: `Masukkan kode ${code} di WhatsApp Anda` });
  return code;
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
  emitGlobalWAStatus(userId, { status: 'logged_out', message: 'WhatsApp disconnected' });
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

function disconnectAllConnections() {
  for (const [userId, entry] of connections) {
    if (entry.disconnectTimer) {
      clearTimeout(entry.disconnectTimer);
      entry.disconnectTimer = null;
    }
    if (entry.sock) {
      try {
        entry.sock.ev.removeAllListeners();
        entry.sock.end(undefined);
      } catch {}
    }
  }
  connections.clear();
  reconnectState.clear();
}

function softResetForUser(userId) {
  const entry = connections.get(userId);
  if (entry) {
    if (entry.disconnectTimer) {
      clearTimeout(entry.disconnectTimer);
      entry.disconnectTimer = null;
    }
    if (entry.sock) {
      try { entry.sock.ev.removeAllListeners('connection.update'); } catch {}
      try { entry.sock.end(undefined); } catch {}
    }
    connections.delete(userId);
    reconnectState.delete(userId);
  }
}

module.exports = { createWAClientForUser, sendWAMessageForUser, requestPairingCodeForUser, disconnectWAForUser, disconnectAllConnections, isConnectedForUser, getConnectedUsers, cleanupOldLidFiles, softResetForUser, lastConnectedAt };
