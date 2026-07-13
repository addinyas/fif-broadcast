const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.resolve(process.env.DB_PATH || path.resolve(__dirname, '..', '..', 'backend', 'database', 'database.sqlite'));

let _db = null;

function getWritableDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('busy_timeout = 5000');
    _db.pragma('wal_autocheckpoint = 1000');
  }
  return _db;
}

function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

module.exports = { getWritableDb, closeDb };
