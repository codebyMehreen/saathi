import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { store, reset } from '../src/store.js';
import { chooseAmount, preparePayment, onCustomerApprove, onCustomerCancel, review, RuleError } from '../src/rules.js';
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
  onCustomerApprove(p);
  assert.equal(p.status, 'pending_review');
  assert.match(p.routingReason, /above the PKR 25,000 limit/);
  assert.equal(store.customer.balance, 185000);
});

test('officer approval pays; officer rejection keeps the note and the money', () => {
  const a = preparePayment(SAMPLE_BILLS.challan, { today: '2026-10-18' });
  onCustomerApprove(a);
  review(a, 'approve', 'Verified with customer');
  assert.equal(a.status, 'paid');
  assert.equal(store.customer.balance, 100000);

  reset();
  const b = preparePayment(SAMPLE_BILLS.challan, { today: '2026-10-18' });
  onCustomerApprove(b);
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
