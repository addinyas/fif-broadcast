const { createWAClientForUser, sendWAMessageForUser, disconnectWAForUser, isConnectedForUser } = require('./wa-client');

const activeClients = new Map();

async function getOrCreateClient(userId, onReady) {
  if (activeClients.has(userId)) {
    if (isConnectedForUser(userId)) {
      if (onReady) onReady();
      return;
    }
    activeClients.delete(userId);
  }

  console.log(`[WA-Mgr] Creating WA client for user ${userId}`);
  const client = await createWAClientForUser(userId, (sock) => {
    activeClients.set(userId, true);
    console.log(`[WA-Mgr] WA client ready for user ${userId}`);
    if (onReady) onReady(sock);
  });

  activeClients.set(userId, false);
  return client;
}

async function sendMessage(userId, jid, text) {
  return sendWAMessageForUser(userId, jid, text);
}

async function disconnect(userId) {
  activeClients.delete(userId);
  await disconnectWAForUser(userId);
}

module.exports = { getOrCreateClient, sendMessage, disconnect };
