const http = require('http');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { pool } = require('./db');

const { createSocketServer, getIO } = require('./socket-server');
const { startQueue, stopQueue } = require('./queue-consumer');
const { startInboxQueue, stopInboxQueue } = require('./inbox');
const { disconnectAllConnections, cleanupOldLidFiles } = require('./wa-client');
const { closePool } = require('./db');

const SOCKET_PORT = parseInt(process.env.SOCKET_PORT || '3001', 10);
const AUTH_BASE = path.resolve(__dirname, '..', 'auth_info');
const MAX_CONNECTION_MS = (parseInt(process.env.MAX_CONNECTION_HOURS || '8', 10)) * 60 * 60 * 1000;

let httpServer = null;

async function main() {
  console.log('[Worker] Starting FIF Broadcast Worker...');

  try {
    const staleCutoff = new Date(Date.now() - MAX_CONNECTION_MS).toISOString();
    const stale = await pool.query("SELECT user_id FROM whatsapp_connections WHERE status = 'connected' AND updated_at < $1", [staleCutoff]);
    for (const row of stale.rows) {
      console.log(`[Worker] Cleaning stale connection for user ${row.user_id} (exceeded ${MAX_CONNECTION_MS / 3600000}h)`);
      await pool.query("UPDATE whatsapp_connections SET status = 'logged_out', qr_code = NULL, updated_at = NOW() WHERE user_id = $1", [row.user_id]);
      const authDir = path.join(AUTH_BASE, `user_${row.user_id}`);
      if (fs.existsSync(authDir)) {
        fs.rmSync(authDir, { recursive: true, force: true });
      }
    }
  } catch (err) {
    console.error('[Worker] Failed to clean stale connections:', err.message);
  }

  try {
    cleanupOldLidFiles();
  } catch (err) {
    console.error('[Worker] Failed to clean LID files:', err.message);
  }

  try {
    const stuck = await pool.query("UPDATE broadcast_histories SET status = 'pending', updated_at = NOW() WHERE status = 'processing'");
    if (stuck.rowCount > 0) {
      console.log(`[Worker] Reset ${stuck.rowCount} stuck 'processing' messages to 'pending'`);
    }
  } catch (err) {
    console.error('[Worker] Failed to reset stuck messages:', err.message);
  }

  httpServer = http.createServer();
  createSocketServer(httpServer);
  const SOCKET_HOST = process.env.SOCKET_HOST || '127.0.0.1';

  httpServer.on('error', (err) => {
    console.error('[Worker] HTTP server error:', err.message);
    if (err.code === 'EADDRINUSE') {
      console.error(`[Worker] Port ${SOCKET_PORT} already in use. Retrying in 5s...`);
      setTimeout(() => {
        httpServer.close();
        httpServer.listen(SOCKET_PORT, SOCKET_HOST);
      }, 5000);
    }
  });

  httpServer.listen(SOCKET_PORT, SOCKET_HOST, () => {
    console.log(`[Worker] Socket.io server running on ${SOCKET_HOST}:${SOCKET_PORT}`);
  });

  startQueue();
  startInboxQueue();

  console.log('[Worker] Ready. Waiting for user connections...');
}

function gracefulShutdown(signal) {
  console.log(`[Worker] Received ${signal}, shutting down gracefully...`);
  stopQueue();
  stopInboxQueue();
  disconnectAllConnections();
  closePool();
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
