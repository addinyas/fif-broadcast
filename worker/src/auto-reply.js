const { getAll } = require('./db');

let cache = [];
let lastFetch = 0;
const CACHE_TTL_MS = 30_000;

async function loadRules() {
  const now = Date.now();
  if (cache.length > 0 && (now - lastFetch) < CACHE_TTL_MS) {
    return cache;
  }

  try {
    cache = await getAll("SELECT * FROM auto_reply_rules WHERE enabled = TRUE ORDER BY sort_order, id");
    lastFetch = now;
  } catch (err) {
    console.error('[AutoReply] Failed to load rules:', err.message);
  }
  return cache;
}

function invalidateCache() {
  cache = [];
  lastFetch = 0;
}

function matches(rule, body) {
  const text = String(body || '').trim();
  const trigger = String(rule.trigger || '').trim();
  switch (rule.match_type) {
    case 'exact':
      return text.toLowerCase() === trigger.toLowerCase();
    case 'starts_with':
      return text.toLowerCase().startsWith(trigger.toLowerCase());
    default:
      return text.toLowerCase().includes(trigger.toLowerCase());
  }
}

function pickReply(rules, userId, body) {
  const userRules = rules.filter((r) => !r.user_id || String(r.user_id) === String(userId));
  const found = userRules.find((r) => matches(r, body));
  return found ? found.reply_body : null;
}

module.exports = { loadRules, invalidateCache, matches, pickReply };
