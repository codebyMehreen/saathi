import { pkr, datePK, BILL_TYPE_LABEL } from '../lib/format.js';

const STATUS = {
  awaiting_customer: {
    ring: 'border-teal-200',
    badge: 'bg-teal-50 text-teal-800',
    label: 'Waiting for your approval · nothing paid yet',
  },
  pending_review: {
    ring: 'border-amber-300',
    badge: 'bg-amber-50 text-amber-800',
    label: 'With a bank officer for review · not paid yet',
  },
  paid: { ring: 'border-emerald-300', badge: 'bg-emerald-50 text-emerald-800', label: 'Paid' },
  rejected: { ring: 'border-rose-300', badge: 'bg-rose-50 text-rose-700', label: 'Not approved by the bank' },
  cancelled: { ring: 'border-slate-200', badge: 'bg-slate-100 text-slate-500', label: 'Cancelled · nothing paid' },
  blocked: { ring: 'border-rose-200', badge: 'bg-rose-50 text-rose-700', label: "Can't be paid" },
};

function Row({ label, children, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`text-right text-sm ${strong ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{children}</dd>
    </div>
  );
}

export default function PaymentCard({ payment, customer, limit, busy, onApprove, onCancel }) {
  const s = STATUS[payment.status] || STATUS.awaiting_customer;
  const open = payment.status === 'awaiting_customer';
  const balanceAfter = customer.balance - payment.amount;
  const dimmed = payment.status === 'cancelled';

  return (
    <div className={`mt-2 rounded-2xl border-2 bg-white shadow-sm ${s.ring} ${dimmed ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {BILL_TYPE_LABEL[payment.billType] || 'Bill'}
          </p>
          <p className="font-semibold leading-tight text-slate-900">{payment.billerName}</p>
        </div>
        <p className="text-lg font-bold whitespace-nowrap text-slate-900">{pkr(payment.amount)}</p>
      </div>

      <dl className="px-4 py-2">
        <Row label="Reference no.">{payment.reference}</Row>
        {payment.customerNameOnBill && <Row label="Name on bill">{payment.customerNameOnBill}</Row>}
        {payment.billingMonth && <Row label="For">{payment.billingMonth}</Row>}
        <Row label="Due date">
          {datePK(payment.dueDate)}
          {payment.overdue && <span className="ml-1 font-medium text-rose-600">· overdue, late amount applies</span>}
        </Row>
        <Row label="Pay from">
          {customer.accountTitle} {customer.accountNumber.slice(-6)}
        </Row>
        {open && <Row label="Balance after" strong>{pkr(balanceAfter)}</Row>}
        {payment.receipt && <Row label="Receipt" strong>{payment.receipt}</Row>}
      </dl>

      <div className="mx-4 mb-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <span className="font-semibold text-teal-800">Why: </span>
        {payment.saathiReason}
      </div>

      {payment.blockedReason && (
        <p className="mx-4 mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{payment.blockedReason}</p>
      )}
      {payment.routingReason && (
        <p className="mx-4 mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{payment.routingReason}</p>
      )}
      {payment.status === 'rejected' && payment.officerNote && (
        <p className="mx-4 mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <span className="font-semibold">Officer note: </span>
          {payment.officerNote}
        </p>
      )}
      {open && payment.needsReview && (
        <p className="mx-4 mb-3 text-xs text-amber-700">
          Above {pkr(limit)}: after you approve, a bank officer reviews it before anything is paid.
        </p>
      )}

      <div className="px-4 pb-4">
        <p className={`rounded-lg px-3 py-1.5 text-center text-xs font-medium ${s.badge}`}>{s.label}</p>
        {open && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => onCancel(payment.id)}
              disabled={busy}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <span className="block">Cancel</span>
              <span className="urdu block text-[11px] leading-6 font-normal opacity-80">منسوخ</span>
            </button>
            <button
              onClick={() => onApprove(payment.id)}
              disabled={busy}
              className="rounded-xl bg-teal-700 px-3 py-2.5 text-sm font-semibold text-white shadow hover:bg-teal-800 disabled:opacity-50"
            >
              <span className="block">Approve</span>
              <span className="urdu block text-[11px] leading-6 font-normal opacity-90">منظور کریں</span>
            </button>
          </div>
        )}
        {payment.status === 'blocked' && (
          <button
            onClick={() => onCancel(payment.id)}
            disabled={busy}
            className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
