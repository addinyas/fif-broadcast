const assert = require('assert');
const { matches, pickReply } = require('../src/auto-reply');

function run() {
  assert.strictEqual(matches({ trigger: 'STOP', match_type: 'exact' }, 'stop'), true);
  assert.strictEqual(matches({ trigger: 'STOP', match_type: 'exact' }, 'berhenti'), false);
  assert.strictEqual(matches({ trigger: 'lunas', match_type: 'contains' }, 'sudah lunas ya'), true);
  assert.strictEqual(matches({ trigger: 'beli', match_type: 'starts_with' }, 'Beli motor kapan?'), true);
  assert.strictEqual(matches({ trigger: 'beli', match_type: 'starts_with' }, 'saya beli motor'), false);

  const rules = [
    { user_id: 1, trigger: 'STOP', match_type: 'exact', reply_body: 'Baik, tidak akan mengirim lagi.' },
    { user_id: null, trigger: 'lunas', match_type: 'contains', reply_body: 'Terima kasih atas konfirmasinya.' },
  ];
  assert.strictEqual(pickReply(rules, 1, 'STOP'), 'Baik, tidak akan mengirim lagi.');
  assert.strictEqual(pickReply(rules, 1, 'sudah lunas semua'), 'Terima kasih atas konfirmasinya.');
  assert.strictEqual(pickReply(rules, 1, 'apa kabar'), null);
  assert.strictEqual(pickReply(rules, 99, 'STOP'), null);
  console.log('auto-reply OK');
}

run();
