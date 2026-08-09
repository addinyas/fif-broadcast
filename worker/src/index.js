const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { pool } = require('./db');

const { createSocketServer, getIO } = require('./socket-server');
const { startQueue, stopQueue } = require('./queue-consumer');
const { startInboxQueue, stopInboxQueue } = require('./inbox');
const { disconnectAllConnections, syncSessionsFromWAHA, handleWAHAWebhook } = require('./wa-client');
const { closePool } = require('./db');

const SOCKET_PORT = parseInt(process.env.SOCKET_PORT || '3001', 10);

let httpServer = null;

async function main() {
  console.log('[Worker] Starting FIF Broadcast Worker...');

  await syncSessionsFromWAHA();

  try {
    const stuck = await pool.query("UPDATE broadcast_histories SET status = 'pending', updated_at = NOW() WHERE status = 'processing'");
    if (stuck.rowCount > 0) {
      console.log(`[Worker] Reset ${stuck.rowCount} stuck 'processing' messages to 'pending'`);
    }
  } catch (err) {
    console.error('[Worker] Failed to reset stuck messages:', err.message);
  }

  httpServer = http.createServer();

  httpServer.on('request', (req, res) => {
    if (req.method === 'POST' && req.url === '/webhook/waha') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
        try {
          handleWAHAWebhook(JSON.parse(body || '{}')).catch((err) => {
            console.error('[Webhook] WAHA handler error:', err.message);
          });
        } catch (err) {
          console.error('[Webhook] Invalid payload:', err.message);
        }
      });
      req.on('error', () => {
        res.writeHead(400);
        res.end();
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });

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
