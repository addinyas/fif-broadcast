const { getWritableDb } = require('./db');
const { sendWAMessage, isConnected } = require('./wa-client');
const { emitBroadcastStatus } = require('./socket-server');

const MIN_DELAY = parseInt(process.env.MIN_DELAY_SEC || '5', 10);
const MAX_DELAY = parseInt(process.env.MAX_DELAY_SEC || '15', 10);
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);

let running = false;
let intervalId = null;

function randomDelay() {
  return Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1) + MIN_DELAY) * 1000;
}

async function processPending() {
  if (!isConnected()) {
    console.log('[Queue] WA client not connected');
    return;
  }

  let writeDb;
  try {
    writeDb = getWritableDb();
  } catch (err) {
    console.error('[Queue] Failed to open writable DB:', err.message);
    return;
  }

  try {
    const pending = writeDb.prepare(`
      SELECT bh.id, bh.customer_id, bh.exact_message, c.phone_number
      FROM broadcast_histories bh
      JOIN customers c ON c.id = bh.customer_id
      WHERE bh.status = 'pending'
      LIMIT 5
    `).all();

    if (pending.length === 0) return;

    console.log(`[Queue] Processing ${pending.length} pending broadcast(s)`);

    for (const row of pending) {
      writeDb.prepare(`
        UPDATE broadcast_histories SET status = 'processing', updated_at = datetime('now')
        WHERE id = ?
      `).run(row.id);

      emitBroadcastStatus({ customer_id: row.customer_id, status: 'processing' });

      try {
        const raw = row.phone_number.replace(/[^0-9]/g, '');
        const normalized = raw.startsWith('0') ? '62' + raw.slice(1) : raw;
        const jid = `${normalized}@s.whatsapp.net`;
        await sendWAMessage(jid, row.exact_message);

        writeDb.prepare(`
          UPDATE broadcast_histories
          SET status = 'sent', sent_at = datetime('now'), updated_at = datetime('now')
          WHERE id = ?
        `).run(row.id);

        emitBroadcastStatus({ customer_id: row.customer_id, status: 'sent' });
        console.log(`[Queue] Sent #${row.id} to ${row.phone_number}`);
      } catch (err) {
        const errMsg = err.message || 'Unknown error';
        writeDb.prepare(`
          UPDATE broadcast_histories
          SET status = 'failed', error_log = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(errMsg, row.id);

        emitBroadcastStatus({ customer_id: row.customer_id, status: 'failed', error: errMsg });
        console.error(`[Queue] Failed #${row.id}: ${errMsg}`);
      }

      const delay = randomDelay();
      console.log(`[Queue] Waiting ${delay / 1000}s (anti-ban)`);
      await new Promise((r) => setTimeout(r, delay));
    }
  } catch (err) {
    console.error('[Queue] Error:', err.message);
  } finally {
    writeDb.close();
  }
}

function startQueue() {
  if (running) return;
  running = true;
  console.log(`[Queue] Started (poll every ${POLL_INTERVAL}ms)`);
  intervalId = setInterval(processPending, POLL_INTERVAL);
}

function stopQueue() {
  running = false;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  console.log('[Queue] Stopped');
}

module.exports = { startQueue, stopQueue };
