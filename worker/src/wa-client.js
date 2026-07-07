const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');

const { emitWAStatus } = require('./socket-server');

const AUTH_DIR = path.resolve(__dirname, '..', 'auth_info');

let sock = null;
let reconnectAttempts = 0;
let reconnecting = false;
let connected = false;

function ensureAuthDir() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }
}

function cleanupSocket() {
  if (sock) {
    try { sock.end(undefined); } catch {}
    sock = null;
  }
}

async function createWAClient(onReady) {
  if (reconnecting) {
    console.log('[WA] Already reconnecting, skipping duplicate');
    return;
  }

  ensureAuthDir();

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  cleanupSocket();

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

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      emitWAStatus({ status: 'awaiting_scan', message: 'Waiting for QR scan', qr });
    }

    if (connection === 'open') {
      console.log('[WA] Connected successfully!');
      reconnectAttempts = 0;
      connected = true;
      reconnecting = false;
      emitWAStatus({ status: 'connected', message: 'WhatsApp connected' });
      if (onReady) onReady(sock);
    }

    if (connection === 'close') {
      connected = false;
      const isLoggedOut = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;
      console.log(`[WA] Disconnected. loggedOut: ${isLoggedOut}, reconnectAttempts: ${reconnectAttempts}`);

      if (isLoggedOut) {
        console.log('[WA] Logged out.');
        reconnecting = false;
        cleanupSocket();
        emitWAStatus({ status: 'logged_out', message: 'WhatsApp logged out' });
        return;
      }

      if (reconnecting) return;

      reconnecting = true;
      reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, Math.min(reconnectAttempts, 5)), 30000);
      console.log(`[WA] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
      cleanupSocket();
      setTimeout(() => {
        reconnecting = false;
        createWAClient(onReady);
      }, delay);
    }
  });

  sock.ev.on('messages.upsert', () => {});

  return sock;
}

function getClient() {
  return sock;
}

async function disconnectWA() {
  reconnecting = false;
  cleanupSocket();
  reconnectAttempts = 0;
  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  }
  emitWAStatus({ status: 'logged_out', message: 'WhatsApp disconnected' });
}

function clearAuth() {
  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  }
}

async function sendWAMessage(jid, text) {
  if (!sock) throw new Error('WA client not connected');
  if (!connected) throw new Error('WA connection not open');

  const number = jid.replace(/@s\.whatsapp\.net$/, '');
  const [check] = await sock.onWhatsApp(number);
  if (!check?.exists) {
    throw new Error('Nomor tidak terdaftar di WhatsApp');
  }

  const result = await sock.sendMessage(jid, { text });
  return result;
}

function isConnected() {
  return connected && sock !== null;
}

module.exports = { createWAClient, getClient, sendWAMessage, disconnectWA, clearAuth, isConnected };
