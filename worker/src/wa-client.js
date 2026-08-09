const { pool } = require('./db');
const { emitWAStatus, emitPairingCode, emitGlobalWAStatus, sendPushNotification, saveNotification } = require('./events');
const { loadNotifSettings } = require('./broadcast-config');
const { captureInboundMessage } = require('./inbox');

const WAHA_URL = (process.env.WAHA_URL || 'http://127.0.0.1:3002').replace(/\/+$/, '');
const WAHA_API_KEY = process.env.WAHA_API_KEY || '';
const WAHA_WEBHOOK_URL = process.env.WAHA_WEBHOOK_URL || 'http://127.0.0.1:3001/webhook/waha';
const POLL_INTERVAL_MS = parseInt(process.env.WAHA_POLL_INTERVAL_MS || '5000', 10);
const WARMUP_MS = 3000 + Math.floor(Math.random() * 2000);

const connections = new Map();
const onReadyCallbacks = new Map();
const lastConnectedAt = new Map();

let pollTimer = null;

function sessionName(userId) {
  return `user_${userId}`;
}

function parseSessionUserId(name) {
  const m = /^user_(\d+)$/.exec(name || '');
  return m ? parseInt(m[1], 10) : null;
}

async function waha(path, options = {}) {
  const res = await fetch(`${WAHA_URL}${path}`, {
    ...options,
    headers: {
      'X-Api-Key': WAHA_API_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.message || '';
    } catch {}
    const err = new Error(`WAHA ${res.status}: ${res.statusText}${detail ? ` ${detail}` : ''}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function shouldNotifyDisconnect() {
  const s = await loadNotifSettings();
  return s.notif_disconnect_enabled === '1';
}

async function sendDisconnectNotifications(userId, body) {
  if (!(await shouldNotifyDisconnect())) return;
  sendPushNotification(userId, 'WhatsApp Terputus', body);
  saveNotification(userId, 'system', 'WhatsApp Terputus', body);
}

async function saveConnectionStatus(userId, status, qrCode) {
  try {
    await pool.query(
      `INSERT INTO whatsapp_connections (user_id, status, qr_code, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         status = EXCLUDED.status,
         qr_code = EXCLUDED.qr_code,
         updated_at = NOW()`,
      [userId, status, qrCode || null]
    );
  } catch (err) {
    console.error(`[WA] Failed to save connection status for user ${userId}:`, err.message);
  }
}

function emitDisconnected(userId, message, dbStatus) {
  const entry = connections.get(userId);
  if (entry) entry.connected = false;
  saveConnectionStatus(userId, dbStatus || 'logged_out', null);
  emitWAStatus(userId, { status: dbStatus || 'logged_out', message });
  emitGlobalWAStatus(userId, { status: dbStatus || 'logged_out', message });
}

async function refreshQR(userId) {
  try {
    const res = await waha(`/api/${sessionName(userId)}/auth/qr?format=raw`);
    const value = res?.value || null;
    const entry = connections.get(userId);
    if (!value || !entry || entry.lastQR === value) return;
    entry.lastQR = value;
    saveConnectionStatus(userId, 'awaiting_scan', value);
    emitWAStatus(userId, { status: 'awaiting_scan', message: 'Scan QR dengan WhatsApp Anda', qr: value });
    emitGlobalWAStatus(userId, { status: 'awaiting_scan', message: 'Scan QR dengan WhatsApp Anda' });
  } catch (err) {
    console.error(`[WA] QR fetch failed for user ${userId}:`, err.message);
  }
}

function handleTransition(userId, entry, wahaStatus) {
  const prev = entry.lastStatus;
  entry.lastStatus = wahaStatus;

  switch (wahaStatus) {
    case 'WORKING':
      if (prev !== 'WORKING') {
        console.log(`[WA] User ${userId} connected successfully!`);
        entry.connected = true;
        entry.connectedAt = Date.now();
        entry.intentionalDisconnect = false;
        lastConnectedAt.set(userId, Date.now());
        saveConnectionStatus(userId, 'connected', null);
        emitWAStatus(userId, { status: 'connected', message: 'WhatsApp connected' });
        emitGlobalWAStatus(userId, { status: 'connected', message: 'WhatsApp connected' });
        const cb = onReadyCallbacks.get(userId);
        if (cb) {
          onReadyCallbacks.delete(userId);
          setTimeout(cb, WARMUP_MS);
        }
      }
      break;

    case 'SCAN_QR_CODE':
      if (prev !== 'SCAN_QR_CODE') {
        entry.connected = false;
        saveConnectionStatus(userId, 'awaiting_scan', null);
        emitWAStatus(userId, { status: 'awaiting_scan', message: 'Scan QR dengan WhatsApp Anda' });
        emitGlobalWAStatus(userId, { status: 'awaiting_scan', message: 'Scan QR dengan WhatsApp Anda' });
      }
      refreshQR(userId);
      break;

    case 'STARTING':
      if (prev === 'WORKING') {
        emitWAStatus(userId, { status: 'reconnecting', message: 'Menghubungkan kembali...' });
        emitGlobalWAStatus(userId, { status: 'reconnecting', message: 'Menghubungkan kembali...' });
      }
      break;

    case 'FAILED':
      if (prev === 'SCAN_QR_CODE') {
        emitDisconnected(userId, 'QR expired. Silakan coba lagi.');
      } else if (entry.connected) {
        emitDisconnected(userId, 'Koneksi gagal. Silakan coba lagi.');
        sendDisconnectNotifications(userId, 'Koneksi WhatsApp gagal. Silakan periksa.');
      }
      break;

    case 'STOPPED':
    case 'DEPRECATED_VERSION':
      if (entry.connected) {
        emitDisconnected(userId, 'WhatsApp terputus.', 'disconnected');
        sendDisconnectNotifications(userId, 'Koneksi WhatsApp terputus.');
      }
      break;
  }
}

async function pollSession(userId, entry) {
  let sess;
  try {
    sess = await waha(`/api/sessions/${sessionName(userId)}`);
  } catch (err) {
    if (err.status === 404) {
      emitDisconnected(userId, 'Sesi tidak ditemukan. Silakan sambungkan kembali.');
    }
    return;
  }
  handleTransition(userId, entry, sess?.status);
}

async function pollAllSessions() {
  if (connections.size === 0) {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    return;
  }
  for (const [userId, entry] of connections) {
    pollSession(userId, entry).catch((err) => {
      console.error(`[WA] Poll failed for user ${userId}:`, err.message);
    });
  }
}

function startPoller() {
  if (pollTimer) return;
  pollTimer = setInterval(pollAllSessions, POLL_INTERVAL_MS);
}

async function ensureSession(userId) {
  const name = sessionName(userId);
  try {
    await waha(`/api/sessions/${name}`);
  } catch (err) {
    if (err.status !== 404) throw err;
    await waha('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }
  await waha(`/api/sessions/${name}/webhooks`, {
    method: 'PUT',
    body: JSON.stringify({
      webhooks: [{ url: WAHA_WEBHOOK_URL, events: ['message'] }],
    }),
  });
  return name;
}

async function createWAClientForUser(userId, onReady) {
  const entry = {
    connected: false,
    connectedAt: null,
    intentionalDisconnect: false,
    lastStatus: null,
    lastQR: null,
  };
  connections.set(userId, entry);
  if (onReady) onReadyCallbacks.set(userId, onReady);
  else onReadyCallbacks.delete(userId);

  const name = await ensureSession(userId);
  await waha(`/api/sessions/${name}/start`, { method: 'POST' });
  startPoller();
  return null;
}

async function sendWAMessageForUser(userId, jid, text) {
  const entry = connections.get(userId);
  if (!entry || !entry.connected) throw new Error('WA connection not open for user');

  const typingDelay = 2000 + Math.floor(Math.random() * 6000);
  await new Promise((r) => setTimeout(r, typingDelay));

  return waha(`/api/sendText?session=${sessionName(userId)}`, {
    method: 'POST',
    body: JSON.stringify({ chatId: jid, text }),
  });
}

async function requestPairingCodeForUser(userId, phoneNumber) {
  const entry = connections.get(userId);
  if (entry?.connected) {
    throw new Error('WhatsApp sudah terhubung');
  }

  const name = await ensureSession(userId);
  await waha(`/api/sessions/${name}/start`, { method: 'POST' });
  startPoller();

  const res = await waha(`/api/${name}/auth/request-code`, {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  });
  console.log(`[WA] Pairing code for user ${userId}: ${res?.code}`);
  emitPairingCode(userId, { code: res?.code, message: `Masukkan kode ${res?.code} di WhatsApp Anda` });
  return res?.code;
}

async function disconnectWAForUser(userId) {
  const name = sessionName(userId);
  const entry = connections.get(userId);
  if (entry) entry.intentionalDisconnect = true;
  try { await waha(`/api/sessions/${name}/stop`, { method: 'POST' }); } catch {}
  try { await waha(`/api/sessions/${name}`, { method: 'DELETE' }); } catch {}
  connections.delete(userId);
  onReadyCallbacks.delete(userId);

  await saveConnectionStatus(userId, 'logged_out', null);
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
  for (const [userId] of connections) {
    waha(`/api/sessions/${sessionName(userId)}/stop`, { method: 'POST' }).catch(() => {});
  }
  connections.clear();
  onReadyCallbacks.clear();
}

function softResetForUser(userId) {
  const entry = connections.get(userId);
  if (entry) {
    entry.connected = false;
    entry.lastStatus = null;
    entry.lastQR = null;
  }
  waha(`/api/sessions/${sessionName(userId)}/stop`, { method: 'POST' }).catch(() => {});
}

async function syncSessionsFromWAHA() {
  let sessions = [];
  try {
    sessions = await waha('/api/sessions');
  } catch (err) {
    console.error(`[Worker] WAHA unreachable at ${WAHA_URL}:`, err.message);
    return;
  }

  const tracked = new Set();
  for (const s of sessions) {
    const userId = parseSessionUserId(s.name);
    if (!userId) continue;
    tracked.add(userId);
    if (connections.has(userId)) continue;

    const entry = { connected: false, connectedAt: null, intentionalDisconnect: false, lastStatus: s.status, lastQR: null };
    connections.set(userId, entry);
    handleTransition(userId, entry, s.status);
    if (s.status === 'SCAN_QR_CODE') refreshQR(userId);
  }

  try {
    const rows = await pool.query("SELECT user_id FROM whatsapp_connections WHERE status = 'connected'");
    for (const row of rows.rows) {
      if (!tracked.has(row.user_id)) {
        await pool.query("UPDATE whatsapp_connections SET status = 'logged_out', qr_code = NULL, updated_at = NOW() WHERE user_id = $1", [row.user_id]);
        console.log(`[Worker] Marked user ${row.user_id} logged_out (no live WAHA session)`);
      }
    }
  } catch (err) {
    console.error('[Worker] Failed to reconcile connection status:', err.message);
  }

  startPoller();
}

function parseWAHAEvent(event) {
  if (!event || event.event !== 'message') return null;
  const userId = parseSessionUserId(event.session);
  if (!userId) return null;

  const payload = event.payload || {};
  if (payload.fromMe) return null;
  const chatId = payload.chatId;
  if (!chatId) return null;
  if (chatId.endsWith('@g.us') || chatId.endsWith('@newsletter') || chatId.endsWith('@broadcast')) return null;

  const body = payload.text || payload.caption || null;
  if (!body) return null;

  return {
    userId,
    remoteJid: chatId,
    msg: {
      key: { id: payload.id, remoteJid: chatId },
      pushName: payload.senderName || payload.sender?.name || null,
      message: { conversation: body },
    },
  };
}

async function handleWAHAWebhook(event) {
  const parsed = parseWAHAEvent(event);
  if (!parsed) return;
  await captureInboundMessage(parsed.userId, parsed.remoteJid, parsed.msg);
}

module.exports = {
  createWAClientForUser,
  sendWAMessageForUser,
  requestPairingCodeForUser,
  disconnectWAForUser,
  disconnectAllConnections,
  isConnectedForUser,
  getConnectedUsers,
  softResetForUser,
  syncSessionsFromWAHA,
  handleWAHAWebhook,
  parseWAHAEvent,
  lastConnectedAt,
};
