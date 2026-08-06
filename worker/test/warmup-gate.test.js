// Self-check warmup-gate. Run: node test/warmup-gate.test.js
// Menggunakan PG dev (butuh .env). Membuat user+profile sementara lalu membersihkan.
const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { pool } = require('../src/db');
const { canSend, recordSend, getState, stageForElapsed, elapsedDaysWib, wibToday } = require('../src/warmup-gate');

function wibTodayStr() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

async function main() {
  assert.strictEqual(stageForElapsed(0), 'passive');
  assert.strictEqual(stageForElapsed(2), 'passive');
  assert.strictEqual(stageForElapsed(3), 'active');
  assert.strictEqual(stageForElapsed(16), 'active');
  assert.strictEqual(stageForElapsed(17), 'mature');
  assert.strictEqual(stageForElapsed(60), 'mature');

  assert.strictEqual(elapsedDaysWib(new Date(Date.now() - 4 * 86400000).toISOString()), 4);
  assert.strictEqual(elapsedDaysWib(new Date().toISOString()), 0);
  assert.strictEqual(wibToday(), wibTodayStr());

  const client = await pool.connect();
  try {
    const email = `warmup_test_${Date.now()}@test.local`;
    const user = await client.query(
      "INSERT INTO users (name, email, password, role, created_at, updated_at) VALUES ($1,$2,$3,$4,NOW(),NOW()) RETURNING id",
      ['Warmup Test', email, 'x', 'marketing']
    );
    const uid = user.rows[0].id;

    await client.query(
      "INSERT INTO number_warmup_profiles (user_id, stage, started_at, stage_started_at, daily_outbound_limit, messages_sent_today, counter_date, health, flags, created_at, updated_at) VALUES ($1,'passive',NOW(),NOW(),0,0,$2,'{}','{}',NOW(),NOW())",
      [uid, wibTodayStr()]
    );

    // passive -> diblokir
    assert.strictEqual((await canSend(uid)).allowed, false, 'passive harus diblokir');

    // umur 30 hari -> mature, boleh kirim
    await client.query(
      "UPDATE number_warmup_profiles SET started_at = NOW() - INTERVAL '30 days', daily_outbound_limit = 150, counter_date = $2 WHERE user_id = $1",
      [uid, wibTodayStr()]
    );
    assert.strictEqual((await canSend(uid)).allowed, true, 'mature harus boleh');
    const state = await getState(uid);
    assert.strictEqual(state.stage, 'mature', 'stage lazy-refresh ke mature');

    // recordSend menaikkan kuota terpakai
    await recordSend(uid);
    const after = await client.query('SELECT messages_sent_today FROM number_warmup_profiles WHERE user_id = $1', [uid]);
    assert.strictEqual(after.rows[0].messages_sent_today, 1, 'recordSend +1');

    // tanpa profile = legacy, tidak diblokir
    assert.strictEqual((await canSend(999999999)).allowed, true, 'legacy tanpa profile dibiarkan');

    await client.query('DELETE FROM number_warmup_profiles WHERE user_id = $1', [uid]);
    await client.query('DELETE FROM users WHERE id = $1', [uid]);

    console.log('warmup-gate OK');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
