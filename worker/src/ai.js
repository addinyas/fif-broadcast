const { getAll } = require('./db');

const DEFAULT_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen2.5:1.5b';

let cache = null;
let lastFetch = 0;
const CACHE_TTL_MS = 30_000;

async function loadSettings() {
  const now = Date.now();
  if (cache && (now - lastFetch) < CACHE_TTL_MS) return cache;

  const defaults = {
    url: DEFAULT_URL,
    model: DEFAULT_MODEL,
    auto_reply_enabled: false,
    classify_enabled: false,
  };
  try {
    const rows = await getAll(
      "SELECT setting_key, setting_value FROM broadcast_settings WHERE setting_key IN ('ai_ollama_url', 'ai_ollama_model', 'ai_auto_reply_enabled', 'ai_classify_enabled')"
    );
    const map = {};
    for (const row of rows) map[row.setting_key] = row.setting_value;
    cache = {
      url: (map.ai_ollama_url || '').trim() || DEFAULT_URL,
      model: (map.ai_ollama_model || '').trim() || DEFAULT_MODEL,
      auto_reply_enabled: map.ai_auto_reply_enabled === '1',
      classify_enabled: map.ai_classify_enabled === '1',
    };
    lastFetch = now;
  } catch (err) {
    console.error('[AI] Failed to load settings:', err.message);
    cache = defaults;
  }
  return cache;
}

function invalidateCache() {
  cache = null;
  lastFetch = 0;
}

async function chat(system, prompt, maxTokens = 128) {
  const s = await loadSettings();
  const res = await fetch(`${s.url.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: s.model,
      stream: false,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      options: { temperature: 0.2, num_predict: maxTokens },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const json = await res.json();
  return String(json.message?.content || '').trim();
}

async function classify(text) {
  const s = await loadSettings();
  if (!s.classify_enabled) return null;

  const raw = await chat(
    'Kamu adalah asisten penjualan motor kredit FIF. Klasifikasikan niat pembeli menjadi skor 25, 50, 75, atau 100. Balas HANYA angka.',
    `Pesan customer:\n"${text}"`,
    16
  );
  const match = raw.match(/\b(25|50|75|100)\b/);
  return match ? Number(match[1]) : null;
}

async function suggestReply(text) {
  const s = await loadSettings();
  if (!s.auto_reply_enabled) return null;

  return chat(
    'Kamu marketing finance FIF untuk penjualan motor kredit. Balas customer dalam Bahasa Indonesia santun, singkat, persuasif, natural, maksimal 3 kalimat, tanpa emoji berlebihan.',
    `Pesan customer:\n"${text}"`,
    200
  );
}

module.exports = { loadSettings, invalidateCache, classify, suggestReply, DEFAULT_MODEL };
