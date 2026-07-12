const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.resolve(process.env.DB_PATH || path.resolve(__dirname, '..', '..', 'backend', 'database', 'database.sqlite'));

function getWritableDb() {
  const d = new Database(DB_PATH);
  d.pragma('journal_mode = WAL');
  d.pragma('busy_timeout = 5000');
  d.pragma('wal_autocheckpoint = 1000');
  return d;
}

function closeDb() {}

module.exports = { getWritableDb, closeDb };
