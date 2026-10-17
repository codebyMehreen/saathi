// The bank's rules. This is the only file that decides anything about money:
// which amount applies, whether the balance allows it, whether it was already
// paid, whether the customer may approve it alone, and executing it.
// The AI never calls these decisions; it only reads the bill and explains.

import { store, addLog, newId } from './store.js';
import { maskNumber } from './mask.js';

export const approvalLimit = () => Number(process.env.APPROVAL_LIMIT) || 25000;

export const pkr = (n) => `PKR ${Math.round(n).toLocaleString('en-US')}`;

// Today in Pakistan, as YYYY-MM-DD.
export const todayPK = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(now);

const digitsOf = (ref) => String(ref ?? '').replace(/\D/g, '');

export function chooseAmount(bill, today = todayPK()) {
  const within = Number(bill.amountWithinDue) || 0;
  const after = Number(bill.amountAfterDue) || 0;
  const overdue = Boolean(bill.dueDate && today > bill.dueDate && after > 0);
  return { amount: overdue ? after : within || after, overdue };
}

export function preparePayment(bill, { language = 'english', saathiReason = '', today } = {}) {
  const { amount, overdue } = chooseAmount(bill, today);
  const payment = {
    id: newId(),
    status: 'awaiting_customer',
    billerName: bill.billerName || 'Unknown biller',
    billType: bill.billType || 'other',
    reference: bill.reference,
    customerNameOnBill: bill.customerNameOnBill || null,
    billingMonth: bill.billingMonth || null,
    dueDate: bill.dueDate || null,
    amountWithinDue: Number(bill.amountWithinDue) || null,
    amountAfterDue: Number(bill.amountAfterDue) || null,
    amount,
    overdue,
    needsReview: amount > approvalLimit(),
    blockedReason: null,
    saathiReason,
    routingReason: null,
    officerNote: null,
    receipt: null,
    language,
    createdAt: new Date().toISOString(),
    decidedAt: null,
  };

  const duplicate = store.payments.find(
    (p) =>
      digitsOf(p.reference) === digitsOf(payment.reference) &&
      p.amount === amount &&
      ['paid', 'pending_review', 'awaiting_customer'].includes(p.status)
  );

  if (duplicate) {
    payment.status = 'blocked';
    payment.blockedReason =
      duplicate.status === 'paid'
        ? `This bill was already paid (receipt ${duplicate.receipt}).`
        : 'This bill is already waiting for approval.';
  } else if (amount > store.customer.balance) {
    payment.status = 'blocked';
    payment.blockedReason = `Your balance (${pkr(store.customer.balance)}) is not enough for ${pkr(amount)}.`;
  }

  store.payments.push(payment);
  addLog(
    'rules',
    payment.status === 'blocked'
      ? `Payment card prepared but blocked: ${payment.billerName}, ${pkr(amount)}`
      : `Payment card prepared: ${payment.billerName}, ref ${maskNumber(payment.reference)}, ${pkr(amount)}. Nothing paid yet.`,
    payment.blockedReason ||
      (overdue
        ? `Due date ${payment.dueDate} has passed, so the late amount applies.`
        : 'Waiting for the customer to approve.'),
    payment.id
  );
  return payment;
}

export class RuleError extends Error {}

export function execute(payment, actor) {
  if (payment.amount > store.customer.balance) {
    payment.status = 'rejected';
    payment.decidedAt = new Date().toISOString();
    payment.officerNote = 'Balance is no longer enough for this payment.';
    addLog('rules', `Payment not executed: ${pkr(payment.amount)}`, payment.officerNote, payment.id);
    return payment;
  }
  store.customer.balance -= payment.amount;
  payment.status = 'paid';
  payment.receipt = `SDB-${Date.now().toString(36).toUpperCase()}-${payment.id.slice(0, 4).toUpperCase()}`;
  payment.decidedAt = new Date().toISOString();
  addLog(
    'system',
    `Paid ${pkr(payment.amount)} to ${payment.billerName}, receipt ${payment.receipt}`,
    `Approved by ${actor}. New balance ${pkr(store.customer.balance)}. (Mock payment, no real money.)`,
    payment.id
  );
  return payment;
}

export function onCustomerApprove(payment) {
  if (payment.status !== 'awaiting_customer') {
    throw new RuleError(`This payment is ${payment.status.replace('_', ' ')}, it can't be approved now.`);
  }
  addLog('customer', `Approved payment of ${pkr(payment.amount)} to ${payment.billerName}`, 'Customer tapped Approve.', payment.id);

  if (payment.amount > approvalLimit()) {
    payment.status = 'pending_review';
    payment.routingReason = `${pkr(payment.amount)} is above the ${pkr(approvalLimit())} limit a customer can approve alone, so a bank officer must review it.`;
    addLog('rules', 'Sent to bank officer for review', payment.routingReason, payment.id);
    return payment;
  }
  return execute(payment, 'the customer');
}

export function onCustomerCancel(payment) {
  if (!['awaiting_customer', 'blocked'].includes(payment.status)) {
    throw new RuleError(`This payment is ${payment.status.replace('_', ' ')}, it can't be cancelled now.`);
  }
  payment.status = 'cancelled';
  payment.decidedAt = new Date().toISOString();
  addLog('customer', `Cancelled payment card for ${payment.billerName}`, 'Customer tapped Cancel. Nothing was paid.', payment.id);
  return payment;
}

export function review(payment, decision, note = '') {
  if (payment.status !== 'pending_review') {
    throw new RuleError('Only payments waiting for review can be decided.');
  }
  const cleanNote = String(note || '').trim().slice(0, 300);
  if (decision === 'approve') {
    payment.officerNote = cleanNote || null;
    addLog('officer', `Officer approved ${pkr(payment.amount)} to ${payment.billerName}`, cleanNote || 'No note.', payment.id);
    return execute(payment, 'a bank officer');
  }
  if (decision === 'reject') {
    payment.status = 'rejected';
    payment.officerNote = cleanNote || 'Rejected by the bank officer.';
    payment.decidedAt = new Date().toISOString();
    addLog('officer', `Officer rejected ${pkr(payment.amount)} to ${payment.billerName}`, payment.officerNote, payment.id);
    return payment;
  }
  throw new RuleError('Decision must be approve or reject.');
}
