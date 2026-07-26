const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || '127.0.0.1',
  port: parseInt(process.env.PG_PORT || '5432', 10),
  database: process.env.PG_DATABASE || 'fif',
  user: process.env.PG_USER || 'fif',
  password: process.env.PG_PASSWORD || 'fif_secure_pass_2026',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected PG pool error:', err.message);
});

async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result;
}

async function getOne(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows[0] || null;
}

async function getAll(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

function closePool() {
  return pool.end();
}

module.exports = { pool, query, getOne, getAll, closePool };
