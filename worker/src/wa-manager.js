const { createWAClientForUser, sendWAMessageForUser, disconnectWAForUser, isConnectedForUser } = require('./wa-client');

const clients = new Map();

async function getOrCreateClient(userId, onReady) {
  const existing = clients.get(userId);
  if (existing && existing.connected) {
    if (onReady) onReady();
    return existing;
  }

  console.log(`[WA-Mgr] Creating WA client for user ${userId}`);
  const client = await createWAClientForUser(userId, (sock) => {
    clients.set(userId, { sock, connected: true });
    console.log(`[WA-Mgr] WA client ready for user ${userId}`);
    if (onReady) onReady(sock);
  });

  clients.set(userId, { sock: client, connected: false });
  return client;
}

function getClient(userId) {
  const entry = clients.get(userId);
  return entry ? entry.sock : null;
}

async function sendMessage(userId, jid, text) {
  return sendWAMessageForUser(userId, jid, text);
}

async function disconnect(userId) {
  clients.delete(userId);
  await disconnectWAForUser(userId);
}

function isConnected(userId) {
  const entry = clients.get(userId);
  return entry ? entry.connected : false;
}

function getConnectedUsers() {
  const connected = [];
  for (const [userId, entry] of clients) {
    if (entry.connected) connected.push(userId);
  }
  return connected;
}

module.exports = { getOrCreateClient, getClient, sendMessage, disconnect, isConnected, getConnectedUsers };
