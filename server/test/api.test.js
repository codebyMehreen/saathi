// The whole journey through the API, in demo mode (no Gemini key, sample bills).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { reset } from '../src/store.js';

delete process.env.GEMINI_API_KEY;

let server;
let base;

before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://localhost:${server.address().port}/api`;
});
after(() => server.close());

async function post(path, body = {}) {
  const res = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}
const last = (arr) => arr[arr.length - 1];
const tinyImage = { mimeType: 'image/jpeg', data: 'AAAA' };

test('full journey: bill photo -> card -> approve -> officer review -> log', async () => {
  reset();
  // 1. Electricity bill in Roman Urdu: card prepared, nothing paid.
  let { body: s } = await post('/chat', { text: 'ye bill pay kar do', image: tinyImage, imageThumb: 'data:image/jpeg;base64,THUMB', sample: 'electricity' });
  assert.equal(s.demoMode, true);
  const elec = last(s.payments);
  assert.equal(elec.status, 'awaiting_customer');
  assert.equal(elec.amount, 8450);
  assert.equal(elec.imageThumb, 'data:image/jpeg;base64,THUMB', 'officer sees the photo');
  assert.equal(last(s.messages).language, 'roman_urdu');
  assert.equal(s.customer.balance, 185000);

  // 2. Approve below the limit: paid.
  ({ body: s } = await post(`/payments/${elec.id}/approve`));
  assert.equal(s.payments.find((p) => p.id === elec.id).status, 'paid');
  assert.equal(s.customer.balance, 185000 - 8450);
  assert.match(last(s.messages).text, /Ho gaya/);

  // 3. Fee challan in Urdu: approve -> officer review, balance unchanged.
  ({ body: s } = await post('/chat', { text: 'یہ چالان جمع کروا دیں', image: tinyImage, sample: 'challan' }));
  const fee = last(s.payments);
  assert.equal(fee.needsReview, true);
  ({ body: s } = await post(`/payments/${fee.id}/approve`));
  assert.equal(s.payments.find((p) => p.id === fee.id).status, 'pending_review');
  assert.equal(s.customer.balance, 176550);

  // 4. Approving again is refused; the officer approves.
  const again = await post(`/payments/${fee.id}/approve`);
  assert.equal(again.status, 409);
  ({ body: s } = await post(`/payments/${fee.id}/review`, { decision: 'approve', note: 'Verified' }));
  assert.equal(s.payments.find((p) => p.id === fee.id).status, 'paid');
  assert.equal(s.customer.balance, 91550);

  // 5. Same challan again is blocked as already paid.
  ({ body: s } = await post('/chat', { image: tinyImage, sample: 'challan' }));
  assert.match(last(s.payments).blockedReason, /already paid/);

  // 6. The log tells the story in order, with actors.
  const actors = s.log.map((e) => e.actor);
  for (const a of ['customer', 'saathi', 'rules', 'officer', 'system']) assert.ok(actors.includes(a), `log has ${a}`);
  const actions = s.log.map((e) => e.action).join('\n');
  assert.ok(actions.indexOf('Sent to bank officer') < actions.indexOf('Officer approved'));

  // 7. No full account or reference number anywhere the page can see.
  const everything = JSON.stringify(s);
  for (const secret of ['0123-4567-8901-4821', '012345678901', '07-13241-0567800', '0713241', '2026-0918-3374', 'Ayesha Raza']) {
    assert.ok(!everything.includes(secret), `"${secret}" must be masked`);
  }
});

test('officer rejection reaches the customer with the note', async () => {
  reset();
  let { body: s } = await post('/chat', { image: tinyImage, sample: 'challan' });
  const fee = last(s.payments);
  await post(`/payments/${fee.id}/approve`);
  ({ body: s } = await post(`/payments/${fee.id}/review`, { decision: 'reject', note: 'Please pay at the institute counter' }));
  assert.equal(s.payments[0].status, 'rejected');
  assert.match(last(s.messages).text, /Please pay at the institute counter/);
  assert.equal(s.customer.balance, 185000);
});

test('without a key, a real photo gets an honest error and nothing is prepared', async () => {
  reset();
  const { body: s } = await post('/chat', { text: 'pay this', image: tinyImage });
  assert.equal(s.payments.length, 0);
  assert.match(last(s.messages).text, /couldn't reach my AI/);
  assert.ok(s.log.some((e) => /Gemini is not connected/.test(e.reason || '')));
});

test('bad input is refused', async () => {
  assert.equal((await post('/chat', {})).status, 400);
  assert.equal((await post('/chat', { image: { mimeType: 'application/pdf', data: 'x' } })).status, 400);
  assert.equal((await post('/payments/nope/approve')).status, 404);
});
