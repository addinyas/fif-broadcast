const http = require('http');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { createSocketServer, getIO, closeReadonlyDb } = require('./socket-server');
const { startQueue, stopQueue } = require('./queue-consumer');
const { disconnectAllConnections, cleanupOldLidFiles } = require('./wa-client');
const { closeDb } = require('./db');

const SOCKET_PORT = parseInt(process.env.SOCKET_PORT || '3001', 10);
const DB_PATH = path.resolve(process.env.DB_PATH || path.resolve(__dirname, '..', '..', 'backend', 'database', 'database.sqlite'));
const AUTH_BASE = path.resolve(__dirname, '..', 'auth_info');
const MAX_CONNECTION_MS = (parseInt(process.env.MAX_CONNECTION_HOURS || '8', 10)) * 60 * 60 * 1000;

let httpServer = null;

async function main() {
  console.log('[Worker] Starting FIF Broadcast Worker...');

  try {
    const db = new Database(DB_PATH, { readonly: false });
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    const staleCutoff = new Date(Date.now() - MAX_CONNECTION_MS).toISOString();
    const stale = db.prepare("SELECT user_id FROM whatsapp_connections WHERE status = 'connected' AND updated_at < ?").all(staleCutoff);
    for (const row of stale) {
      console.log(`[Worker] Cleaning stale connection for user ${row.user_id} (exceeded ${MAX_CONNECTION_MS / 3600000}h)`);
      db.prepare("UPDATE whatsapp_connections SET status = 'logged_out', qr_code = NULL, updated_at = datetime('now') WHERE user_id = ?").run(row.user_id);
      const authDir = path.join(AUTH_BASE, `user_${row.user_id}`);
      if (fs.existsSync(authDir)) {
        fs.rmSync(authDir, { recursive: true, force: true });
      }
    }
    db.close();
  } catch (err) {
    console.error('[Worker] Failed to clean stale connections:', err.message);
  }

  try {
    cleanupOldLidFiles();
  } catch (err) {
    console.error('[Worker] Failed to clean LID files:', err.message);
  }

  try {
    const db = new Database(DB_PATH);
    db.pragma('busy_timeout = 5000');
    const stuck = db.prepare("UPDATE broadcast_histories SET status = 'pending', updated_at = datetime('now') WHERE status = 'processing'").run();
    if (stuck.changes > 0) {
      console.log(`[Worker] Reset ${stuck.changes} stuck 'processing' messages to 'pending'`);
    }
    db.close();
  } catch (err) {
    console.error('[Worker] Failed to reset stuck messages:', err.message);
  }

  httpServer = http.createServer();
  createSocketServer(httpServer);

  httpServer.listen(SOCKET_PORT, () => {
    console.log(`[Worker] Socket.io server running on port ${SOCKET_PORT}`);
  });

  startQueue();

  console.log('[Worker] Ready. Waiting for user connections...');
}

function gracefulShutdown(signal) {
  console.log(`[Worker] Received ${signal}, shutting down gracefully...`);
  stopQueue();
  disconnectAllConnections();
  closeDb();
  closeReadonlyDb();
  const io = getIO();
  if (io) { io.close(); }
  if (httpServer) {
    httpServer.close(() => {
      console.log('[Worker] HTTP server closed');
      process.exit(0);
    });
  }
  setTimeout(() => process.exit(0), 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('[Worker] Uncaught exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('[Worker] Unhandled rejection:', reason);
});

main().catch((err) => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
