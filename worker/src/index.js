const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { createSocketServer } = require('./socket-server');
const { getOrCreateClient } = require('./wa-manager');
const { startQueue } = require('./queue-consumer');

const SOCKET_PORT = parseInt(process.env.SOCKET_PORT || '3001', 10);

async function main() {
  console.log('[Worker] Starting FIF Broadcast Worker...');

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
