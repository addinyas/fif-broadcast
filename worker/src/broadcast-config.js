const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(process.env.DB_PATH || path.resolve(__dirname, '..', '..', 'backend', 'database', 'database.sqlite'));

const DEFAULTS = {
  messages_per_session: 20,
  min_delay_sec: 6,
  max_delay_sec: 12,
  rest_every_x_messages: 12,
  rest_duration_min_sec: 30,
  rest_duration_max_sec: 90,
  session_break_min_sec: 1200,
  session_break_max_sec: 2400,
  max_retry: 3,
  random_template: 1,
  random_delay: 1,
  concurrency: 6,
  queue_enabled: 1,
};

let cache = null;
let lastFetch = 0;
const CACHE_TTL_MS = 30_000;

function loadSettings() {
  const now = Date.now();
  if (cache && (now - lastFetch) < CACHE_TTL_MS) {
    return cache;
  }

  let db;
  try {
    db = new Database(DB_PATH, { readonly: true });
    db.pragma('busy_timeout = 5000');
    const rows = db.prepare('SELECT setting_key, setting_value FROM broadcast_settings').all();
    const settings = { ...DEFAULTS };
    for (const row of rows) {
      const key = row.setting_key;
      if (key in DEFAULTS) {
        const parsed = parseInt(row.setting_value, 10);
        settings[key] = isNaN(parsed) ? DEFAULTS[key] : parsed;
      }
    }
    cache = settings;
    lastFetch = now;
    return settings;
  } catch (err) {
    console.error('[Config] Failed to load broadcast settings:', err.message);
    return cache || DEFAULTS;
  } finally {
    if (db) db.close();
  }
}

function invalidateCache() {
  cache = null;
  lastFetch = 0;
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = { loadSettings, invalidateCache, randomBetween, DEFAULTS };
