const { query, getOne } = require('./db');

// Mirrors App\Services\WarmupService (backend). Worker akses PG langsung, bukan API Laravel,
// jadi logika stage dipleks di sini. Sinkronkan kedua sisi bila parameter berubah.
// ponytail: tanpa profile (nomor legacy) = dibiarkan jalan seperti sebelum fitur ini ada.
const STAGES = {
  passive: { days: 3, dailyLimit: 0 },
  active: { days: 14, dailyLimit: 50 },
  mature: { days: null, dailyLimit: 150 },
};

function stageForElapsed(elapsedDays) {
  if (elapsedDays < STAGES.passive.days) return 'passive';
  if (elapsedDays < STAGES.passive.days + STAGES.active.days) return 'active';
  return 'mature';
}

// Tanggal "hari ini" zona WIB (sinkron dengan isWithinBusinessHours di queue-consumer).
function wibToday() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function startOfDayWib(ms) {
  const d = new Date(ms + 7 * 3600 * 1000);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime() - 7 * 3600 * 1000;
}

function elapsedDaysWib(startedAt) {
  const startMs = new Date(startedAt).getTime();
  if (!startMs) return 0;
  return Math.max(0, Math.round((startOfDayWib(Date.now()) - startOfDayWib(startMs)) / 86400000));
}

// Muat state + refresh lazy: naikkan stage bila umur sudah lewat, reset kuota saat ganti tanggal.
async function getState(userId) {
  let row = await getOne('SELECT * FROM number_warmup_profiles WHERE user_id = $1', [userId]);
  if (!row) return null;

  const today = wibToday();
  const target = stageForElapsed(elapsedDaysWib(row.started_at));
  let changed = false;

  if (row.stage !== target) {
    await query(
      "UPDATE number_warmup_profiles SET stage = $2, stage_started_at = NOW(), daily_outbound_limit = $3, updated_at = NOW() WHERE user_id = $1",
      [userId, target, STAGES[target].dailyLimit]
    );
    changed = true;
  }
  if ((row.counter_date || '') !== today) {
    await query(
      "UPDATE number_warmup_profiles SET messages_sent_today = 0, counter_date = $2, updated_at = NOW() WHERE user_id = $1",
      [userId, today]
    );
    changed = true;
  }

  return changed ? getOne('SELECT * FROM number_warmup_profiles WHERE user_id = $1', [userId]) : row;
}

async function canSend(userId) {
  const row = await getState(userId);
  if (!row) return { allowed: true, reason: 'legacy (no warmup profile)' };

  const flags = row.flags || {};
  if (flags.auto_pause) return { allowed: false, reason: 'auto-pause: kesehatan menurun' };
  if (flags.allow_broadcast === false) return { allowed: false, reason: 'broadcast dimatikan manual' };
  if (row.stage === 'passive') return { allowed: false, reason: 'stage passive (warm-up belum selesai)' };
  if (row.messages_sent_today >= row.daily_outbound_limit) {
    return { allowed: false, reason: `batas harian warm-up (${row.daily_outbound_limit}) tercapai` };
  }

  return { allowed: true, reason: '' };
}

async function recordSend(userId) {
  if (!(await getOne('SELECT id FROM number_warmup_profiles WHERE user_id = $1', [userId]))) return;
  await query(
    "UPDATE number_warmup_profiles SET messages_sent_today = messages_sent_today + 1, last_send_at = NOW(), updated_at = NOW() WHERE user_id = $1",
    [userId]
  );
}

module.exports = { canSend, recordSend, getState, stageForElapsed, elapsedDaysWib, wibToday, STAGES };
