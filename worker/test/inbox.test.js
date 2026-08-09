const assert = require('assert');
const { normalizeJid, getContactPhone } = require('../src/inbox');

function run() {
  assert.strictEqual(normalizeJid('6281234567890@s.whatsapp.net'), '6281234567890');
  assert.strictEqual(normalizeJid('6281234567890@g.us'), '6281234567890');
  assert.strictEqual(getContactPhone('6281234567890@s.whatsapp.net'), '081234567890');
  assert.strictEqual(getContactPhone('081234567890@s.whatsapp.net'), '081234567890');
  console.log('inbox helpers OK');
}

run();
