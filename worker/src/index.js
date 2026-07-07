const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { createSocketServer, setOnDisconnectRequest, emitWAStatus } = require('./socket-server');
const { createWAClient, disconnectWA, clearAuth } = require('./wa-client');
const { startQueue, stopQueue } = require('./queue-consumer');

const SOCKET_PORT = parseInt(process.env.SOCKET_PORT || '3001', 10);

async function initWA() {
  console.log('[Worker] Initializing WhatsApp client...');
  await createWAClient(() => {
    console.log('[Worker] WA ready, starting queue consumer');
    startQueue();
  });
}

async function main() {
  console.log('[Worker] Starting FIF Broadcast Worker...');

  const httpServer = http.createServer();
  createSocketServer(httpServer);

  setOnDisconnectRequest(async () => {
    console.log('[Worker] Handling disconnect request...');
    stopQueue();
    await disconnectWA();
    emitWAStatus({ status: 'awaiting_scan', message: 'Prepare new QR' });
    clearAuth();
    setTimeout(() => initWA(), 1000);
  });

  httpServer.listen(SOCKET_PORT, () => {
    console.log(`[Worker] Socket.io server running on port ${SOCKET_PORT}`);
  });

  await initWA();
}

main().catch((err) => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
