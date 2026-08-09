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

let notifCache = null;
let notifLastFetch = 0;

async function loadNotifSettings() {
  const now = Date.now();
  if (notifCache && (now - notifLastFetch) < CACHE_TTL_MS) {
    return notifCache;
  }

  try {
    const { getAll } = require('./db');
    const rows = await getAll("SELECT setting_key, setting_value FROM broadcast_settings WHERE setting_key IN ('notif_disconnect_enabled', 'notif_disconnect_level')");
    const settings = { notif_disconnect_enabled: '0', notif_disconnect_level: 'total' };
    for (const row of rows) {
      settings[row.setting_key] = row.setting_value;
    }
    notifCache = settings;
    notifLastFetch = now;
    return settings;
  } catch (err) {
    console.error('[Config] Failed to load notif settings:', err.message);
    return notifCache || { notif_disconnect_enabled: '0', notif_disconnect_level: 'total' };
  }
}

async function loadSettings() {
  const now = Date.now();
  if (cache && (now - lastFetch) < CACHE_TTL_MS) {
    return cache;
  }

  try {
    const { getAll } = require('./db');
    const rows = await getAll('SELECT setting_key, setting_value FROM broadcast_settings');
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
  }
}

function invalidateCache() {
  cache = null;
  lastFetch = 0;
  notifCache = null;
  notifLastFetch = 0;
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = { loadSettings, loadNotifSettings, invalidateCache, randomBetween, DEFAULTS };
