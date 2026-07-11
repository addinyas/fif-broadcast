const http = require('http');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const pino = require('pino');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const { createSocketServer } = require('./socket-server');
const { getOrCreateClient } = require('./wa-manager');
const { startQueue } = require('./queue-consumer');
const { closeDb } = require('./db');

const SOCKET_PORT = parseInt(process.env.SOCKET_PORT || '3001', 10);
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '..', '..', 'backend', 'database', 'database.sqlite');
const AUTH_BASE = path.resolve(__dirname, '..', 'auth_info');
const MAX_CONNECTION_MS = (parseInt(process.env.MAX_CONNECTION_HOURS || '8', 10)) * 60 * 60 * 1000;

let httpServer = null;

async function main() {
  logger.info('[Worker] Starting FIF Broadcast Worker...');

  // Clean stale connections that exceeded max connection time
  try {
    const db = new Database(DB_PATH, { readonly: false });
    db.pragma('journal_mode = WAL');
    const staleCutoff = new Date(Date.now() - MAX_CONNECTION_MS).toISOString();
    const stale = db.prepare("SELECT user_id FROM whatsapp_connections WHERE status = 'connected' AND updated_at < ?").all(staleCutoff);
    for (const row of stale) {
      logger.info(`[Worker] Cleaning stale connection for user ${row.user_id} (exceeded ${MAX_CONNECTION_MS / 3600000}h)`);
      db.prepare("UPDATE whatsapp_connections SET status = 'logged_out', qr_code = NULL, updated_at = datetime('now') WHERE user_id = ?").run(row.user_id);
      const authDir = path.join(AUTH_BASE, `user_${row.user_id}`);
      if (fs.existsSync(authDir)) {
        fs.rmSync(authDir, { recursive: true, force: true });
      }
    }
    db.close();
  } catch (err) {
    logger.error('[Worker] Failed to clean stale connections:', err.message);
  }

  // Reset stuck 'processing' messages to 'pending' on startup
  try {
    const db = new Database(DB_PATH);
    const stuck = db.prepare("UPDATE broadcast_histories SET status = 'pending', updated_at = datetime('now') WHERE status = 'processing'").run();
    if (stuck.changes > 0) {
      logger.info(`[Worker] Reset ${stuck.changes} stuck 'processing' messages to 'pending'`);
    }
    db.close();
  } catch (err) {
    logger.error('[Worker] Failed to reset stuck messages:', err.message);
  }

  httpServer = http.createServer();
  createSocketServer(httpServer);

  httpServer.listen(SOCKET_PORT, () => {
    logger.info(`[Worker] Socket.io server running on port ${SOCKET_PORT}`);
  });

  startQueue();

  logger.info('[Worker] Ready. Waiting for user connections...');
}

function gracefulShutdown(signal) {
  logger.info(`[Worker] Received ${signal}, shutting down gracefully...`);
  closeDb();
  if (httpServer) {
    httpServer.close(() => {
      logger.info('[Worker] HTTP server closed');
      process.exit(0);
    });
  }
  setTimeout(() => process.exit(0), 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('[Worker] Uncaught exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('[Worker] Unhandled rejection:', reason);
});

main().catch((err) => {
  logger.error('[Worker] Fatal error:', err);
  process.exit(1);
});
