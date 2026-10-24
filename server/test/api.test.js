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
// Every customer test starts signed in, the way the phone app does after the PIN.
async function freshSignedIn() {
  reset();
  assert.equal((await post('/session/sign-in', { pin: '1234' })).status, 200);
}
const tinyImage = { mimeType: 'image/jpeg', data: 'AAAA' };

test('full journey: bill photo -> card -> approve -> officer review -> log', async () => {
  await freshSignedIn();
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
  // One tap is not enough for PKR 85,000.
  const oneTap = await post(`/payments/${fee.id}/approve`);
  assert.equal(oneTap.status, 409);
  assert.match(oneTap.body.error, /second tap/);
  ({ body: s } = await post(`/payments/${fee.id}/approve`, { confirmed: true }));
  assert.equal(s.payments.find((p) => p.id === fee.id).status, 'pending_review');
  assert.equal(s.customer.balance, 176550);

  // 4. Approving again is refused; the officer approves.
  const again = await post(`/payments/${fee.id}/approve`, { confirmed: true });
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
  await freshSignedIn();
  let { body: s } = await post('/chat', { image: tinyImage, sample: 'challan' });
  const fee = last(s.payments);
  await post(`/payments/${fee.id}/approve`, { confirmed: true });
  const noReason = await post(`/payments/${fee.id}/review`, { decision: 'reject', note: '' });
  assert.equal(noReason.status, 409);
  ({ body: s } = await post(`/payments/${fee.id}/review`, { decision: 'reject', note: 'Please pay at the institute counter' }));
  assert.equal(s.payments[0].status, 'rejected');
  assert.match(last(s.messages).text, /Please pay at the institute counter/);
  assert.equal(s.customer.balance, 185000);
});

test('without a key, a real photo gets an honest error and nothing is prepared', async () => {
  await freshSignedIn();
  const { body: s } = await post('/chat', { text: 'pay this', image: tinyImage });
  assert.equal(s.payments.length, 0);
  assert.match(last(s.messages).text, /couldn't reach my AI/);
  assert.ok(s.log.some((e) => /Gemini is not connected/.test(e.reason || '')));
});

test('bad input is refused', async () => {
  await freshSignedIn();
  assert.equal((await post('/chat', {})).status, 400);
  assert.equal((await post('/chat', { image: { mimeType: 'application/pdf', data: 'x' } })).status, 400);
  assert.equal((await post('/payments/nope/approve')).status, 404);
});

// Sign-in, 24 Oct 2026.

test('signed out, the customer can neither chat nor approve', async () => {
  reset();
  const s = (await post('/chat', { text: 'balance kitna hai?' }));
  assert.equal(s.status, 401);
  assert.equal((await post('/payments/x/approve', { confirmed: true })).status, 401);
  const { body } = await post('/session/sign-out');
  assert.equal(body.session.signedIn, false);
  assert.equal(body.messages.length, 0);
});

test('the right PIN signs in; reset signs out again', async () => {
  reset();
  let { status, body } = await post('/session/sign-in', { pin: '1234' });
  assert.equal(status, 200);
  assert.equal(body.session.signedIn, true);
  assert.ok(body.log.some((e) => e.action === 'Signed in to the phone app'));
  ({ body } = await post('/reset'));
  assert.equal(body.session.signedIn, false);
});

test('three wrong PINs lock sign-in, even for the right PIN', async () => {
  reset();
  let r = await post('/session/sign-in', { pin: '0000' });
  assert.equal(r.status, 401);
  assert.match(r.body.error, /2 tries left/);
  r = await post('/session/sign-in', { pin: '1111' });
  assert.match(r.body.error, /1 try left/);
  r = await post('/session/sign-in', { pin: '2222' });
  assert.equal(r.status, 423);
  assert.equal(r.body.session.locked, true);
  r = await post('/session/sign-in', { pin: '1234' });
  assert.equal(r.status, 423, 'still locked');
  assert.equal(r.body.session.signedIn, false);
});

test('the PIN itself never appears in what the page receives', async () => {
  reset();
  const { body } = await post('/session/sign-in', { pin: '9999' });
  assert.ok(!JSON.stringify(body.session).includes('1234'));
});
