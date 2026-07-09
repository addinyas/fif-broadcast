const http = require('http');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { createSocketServer } = require('./socket-server');
const { getOrCreateClient } = require('./wa-manager');
const { startQueue } = require('./queue-consumer');

const SOCKET_PORT = parseInt(process.env.SOCKET_PORT || '3001', 10);
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '..', '..', 'backend', 'database', 'database.sqlite');
const AUTH_BASE = path.resolve(__dirname, '..', 'auth_info');
const MAX_CONNECTION_MS = (parseInt(process.env.MAX_CONNECTION_HOURS || '8', 10)) * 60 * 60 * 1000;

async function main() {
  console.log('[Worker] Starting FIF Broadcast Worker...');

  // Clean stale connections that exceeded max connection time
  try {
    const db = new Database(DB_PATH, { readonly: false });
    db.pragma('journal_mode = WAL');
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

  const httpServer = http.createServer();
  createSocketServer(httpServer);

  httpServer.listen(SOCKET_PORT, () => {
    console.log(`[Worker] Socket.io server running on port ${SOCKET_PORT}`);
  });

  startQueue();

  console.log('[Worker] Ready. Waiting for user connections...');
}

main().catch((err) => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
