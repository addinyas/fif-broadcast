const assert = require('assert');
const { parseWAHAEvent } = require('../src/wa-client');

function run() {
  const parsed = parseWAHAEvent({
    event: 'message',
    session: 'user_5',
    payload: {
      id: 'msg-1',
      chatId: '6281234567890@s.whatsapp.net',
      fromMe: false,
      text: 'Halo',
      senderName: 'Budi',
    },
  });
  assert.strictEqual(parsed.userId, 5);
  assert.strictEqual(parsed.remoteJid, '6281234567890@s.whatsapp.net');
  assert.strictEqual(parsed.msg.message.conversation, 'Halo');
  assert.strictEqual(parsed.msg.pushName, 'Budi');

  assert.strictEqual(parseWAHAEvent({ event: 'session.status', session: 'user_5', payload: {} }), null);
  assert.strictEqual(parseWAHAEvent({ event: 'message', session: 'user_5', payload: { fromMe: true, chatId: 'x@s.whatsapp.net', text: 'ok' } }), null);
  assert.strictEqual(parseWAHAEvent({ event: 'message', session: 'user_5', payload: { fromMe: false, chatId: 'abc@g.us', text: 'halo' } }), null);
  assert.strictEqual(parseWAHAEvent({ event: 'message', session: 'other_session', payload: { fromMe: false, chatId: 'x@s.whatsapp.net', text: 'hi' } }), null);
  assert.strictEqual(parseWAHAEvent({ event: 'message', session: 'user_5', payload: { fromMe: false, chatId: 'x@s.whatsapp.net' } }), null);
  console.log('wa-client parseWAHAEvent OK');
}

run();
