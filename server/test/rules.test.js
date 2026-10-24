import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { store, reset } from '../src/store.js';
import { chooseAmount, preparePayment, onCustomerApprove, onCustomerCancel, review, RuleError, expireStale, approvedTodayByCustomer, nameDiffers, CARD_TTL_MS, todayPK } from '../src/rules.js';
import { SAMPLE_BILLS } from '../src/samples.js';

beforeEach(() => reset());

test('chooseAmount uses the late amount only after the due date', () => {
  const bill = SAMPLE_BILLS.electricity; // due 2026-10-24, 8,450 / 9,295
  assert.deepEqual(chooseAmount(bill, '2026-10-18'), { amount: 8450, overdue: false });
  assert.deepEqual(chooseAmount(bill, '2026-10-24'), { amount: 8450, overdue: false });
  assert.deepEqual(chooseAmount(bill, '2026-10-25'), { amount: 9295, overdue: true });
});

test('a prepared payment moves no money', () => {
  const p = preparePayment(SAMPLE_BILLS.electricity, { today: '2026-10-18' });
  assert.equal(p.status, 'awaiting_customer');
  assert.equal(store.customer.balance, 185000);
});

test('approving a small bill pays it and lowers the balance', () => {
  const p = preparePayment(SAMPLE_BILLS.electricity, { today: '2026-10-18' });
  onCustomerApprove(p);
  assert.equal(p.status, 'paid');
  assert.match(p.receipt, /^SDB-/);
  assert.equal(store.customer.balance, 185000 - 8450);
});

test('approving above the limit goes to officer review, not payment', () => {
  const p = preparePayment(SAMPLE_BILLS.challan, { today: '2026-10-18' });
  onCustomerApprove(p, { confirmed: true });
  assert.equal(p.status, 'pending_review');
  assert.match(p.routingReason, /above the PKR 25,000 limit/);
  assert.equal(store.customer.balance, 185000);
});

test('officer approval pays; officer rejection keeps the note and the money', () => {
  const a = preparePayment(SAMPLE_BILLS.challan, { today: '2026-10-18' });
  onCustomerApprove(a, { confirmed: true });
  review(a, 'approve', 'Verified with customer');
  assert.equal(a.status, 'paid');
  assert.equal(store.customer.balance, 100000);

  reset();
  const b = preparePayment(SAMPLE_BILLS.challan, { today: '2026-10-18' });
  onCustomerApprove(b, { confirmed: true });
  review(b, 'reject', 'Challan number does not match the institute');
  assert.equal(b.status, 'rejected');
  assert.equal(b.officerNote, 'Challan number does not match the institute');
  assert.equal(store.customer.balance, 185000);
});

test('the same bill cannot be prepared twice while pending or after paying', () => {
  const first = preparePayment(SAMPLE_BILLS.electricity, { today: '2026-10-18' });
  const again = preparePayment(SAMPLE_BILLS.electricity, { today: '2026-10-18' });
  assert.equal(again.status, 'blocked');
  assert.match(again.blockedReason, /already waiting/);
  onCustomerApprove(first);
  const third = preparePayment(SAMPLE_BILLS.electricity, { today: '2026-10-18' });
  assert.match(third.blockedReason, /already paid/);
});

test('a bill bigger than the balance is blocked and cannot be approved', () => {
  const p = preparePayment({ ...SAMPLE_BILLS.challan, amountWithinDue: 900000 }, { today: '2026-10-18' });
  assert.equal(p.status, 'blocked');
  assert.match(p.blockedReason, /not enough/);
  assert.throws(() => onCustomerApprove(p), RuleError);
});

test('cancel pays nothing; decisions cannot be repeated', () => {
  const p = preparePayment(SAMPLE_BILLS.electricity, { today: '2026-10-18' });
  onCustomerCancel(p);
  assert.equal(p.status, 'cancelled');
  assert.throws(() => onCustomerApprove(p), RuleError);
  assert.throws(() => review(p, 'approve'), RuleError);
  assert.equal(store.customer.balance, 185000);
});

// Safety rules, 24 Oct 2026.

test('PKR 10,000 or more needs a second, confirming tap', () => {
  const p = preparePayment({ ...SAMPLE_BILLS.electricity, amountWithinDue: 12000, reference: '111122223333' }, { today: '2026-10-18' });
  assert.equal(p.needsConfirm, true);
  assert.throws(() => onCustomerApprove(p), /needs a second tap/);
  assert.equal(p.status, 'awaiting_customer');
  assert.equal(store.customer.balance, 185000);
  onCustomerApprove(p, { confirmed: true });
  assert.equal(p.status, 'paid');
});

test('small bills still need only one tap', () => {
  const p = preparePayment(SAMPLE_BILLS.electricity, { today: '2026-10-18' });
  assert.equal(p.needsConfirm, false);
  onCustomerApprove(p);
  assert.equal(p.status, 'paid');
});

test('the daily limit sends a small bill to the officer once today is used up', () => {
  // Three bills of 20,000 each, under the 25,000 single-payment limit.
  const bill = (ref) => ({ ...SAMPLE_BILLS.electricity, amountWithinDue: 20000, reference: ref });
  const a = preparePayment(bill('100000000001'), { today: '2026-10-18' });
  const b = preparePayment(bill('100000000002'), { today: '2026-10-18' });
  const c = preparePayment(bill('100000000003'), { today: '2026-10-18' });
  onCustomerApprove(a, { confirmed: true });
  onCustomerApprove(b, { confirmed: true });
  assert.equal(approvedTodayByCustomer(), 40000);
  onCustomerApprove(c, { confirmed: true });
  assert.equal(c.status, 'pending_review');
  assert.equal(c.routingKind, 'daily');
  assert.match(c.routingReason, /already approved PKR 40,000/);
  assert.equal(store.customer.balance, 185000 - 40000);
  // Officer-approved money doesn't count against the customer's own limit.
  review(c, 'approve', 'Checked');
  assert.equal(approvedTodayByCustomer(), 40000);
});

test('an unapproved card expires after 15 minutes and can no longer be paid', () => {
  const p = preparePayment(SAMPLE_BILLS.electricity, { today: '2026-10-18' });
  const later = Date.parse(p.createdAt) + CARD_TTL_MS + 1000;
  assert.throws(() => onCustomerApprove(p, { now: later }), /expired/);
  assert.equal(p.status, 'expired');
  assert.equal(store.customer.balance, 185000);
  // An expired card does not block preparing the same bill again.
  const again = preparePayment(SAMPLE_BILLS.electricity, { today: '2026-10-18' });
  assert.equal(again.status, 'awaiting_customer');
});

test('a card inside its 15 minutes does not expire', () => {
  const p = preparePayment(SAMPLE_BILLS.electricity, { today: '2026-10-18' });
  expireStale(Date.parse(p.createdAt) + CARD_TTL_MS - 1000);
  assert.equal(p.status, 'awaiting_customer');
});

test('cards warn about a new biller, a different name and a low balance, without blocking', () => {
  const first = preparePayment(SAMPLE_BILLS.electricity, { today: '2026-10-18' });
  assert.equal(first.flags.newBiller, true);
  onCustomerApprove(first);
  const second = preparePayment({ ...SAMPLE_BILLS.electricity, reference: '999988887777' }, { today: '2026-10-18' });
  assert.equal(second.flags.newBiller, false, 'paid this biller before');

  store.customer.balance = 12000;
  const low = preparePayment({ ...SAMPLE_BILLS.electricity, amountWithinDue: 9000, reference: '555566667777', billerName: 'Sui Gas' }, { today: '2026-10-18' });
  assert.equal(low.flags.lowBalance, true);
  assert.equal(low.status, 'awaiting_customer');
});

test('name check: a shared word is the same person, none is a warning', () => {
  assert.equal(nameDiffers('AYESHA R.', 'Ayesha Raza'), false);
  assert.equal(nameDiffers('Muhammad Bilal', 'Ayesha Raza'), true);
  assert.equal(nameDiffers('', 'Ayesha Raza'), false);
  assert.equal(nameDiffers(null, 'Ayesha Raza'), false);
});

test('an officer cannot reject without a reason', () => {
  const p = preparePayment(SAMPLE_BILLS.challan, { today: '2026-10-18' });
  onCustomerApprove(p, { confirmed: true });
  assert.throws(() => review(p, 'reject', '   '), /reason/);
  assert.equal(p.status, 'pending_review');
});

test('todayPK is Pakistan time', () => {
  assert.equal(todayPK(new Date('2026-10-24T20:30:00Z')), '2026-10-25');
});

test('a sign-in lock lifts after 60 seconds', async () => {
  const { signIn, sessionState, LOCK_MS } = await import('../src/session.js');
  const t0 = 1_000_000;
  for (const pin of ['0', '1', '2']) assert.throws(() => signIn(pin, t0));
  assert.equal(sessionState(t0 + 1000).locked, true);
  assert.equal(sessionState(t0 + LOCK_MS + 1).locked, false);
  signIn('1234', t0 + LOCK_MS + 1);
  assert.equal(store.session.signedIn, true);
});
