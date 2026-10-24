import { useEffect, useState } from 'react';
import { pkr, datePK, timePK, BILL_TYPE_LABEL } from '../lib/format.js';

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
  expired: { ring: 'border-slate-200', badge: 'bg-slate-100 text-slate-500', label: 'Expired after 15 minutes · nothing paid' },
  blocked: { ring: 'border-rose-200', badge: 'bg-rose-50 text-rose-700', label: "Can't be paid" },
};

function Shield({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function Row({ label, children, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`text-right text-sm ${strong ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{children}</dd>
    </div>
  );
}

// Minutes and seconds left on a card the customer hasn't approved yet.
function useTimeLeft(expiresAt, active) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  if (!expiresAt) return null;
  const ms = Math.max(0, Date.parse(expiresAt) - now);
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { ms, text: `${m}:${String(s).padStart(2, '0')}` };
}

// Things worth a second look. They inform; the bank's rules decide.
function Warnings({ payment, customer }) {
  const f = payment.flags || {};
  const items = [
    f.newBiller && { tone: 'sky', text: `First payment to ${payment.billerName.replace(/\.$/, '')}. Check the biller name is right.` },
    f.nameDiffers && {
      tone: 'amber',
      text: `The name on the bill (${payment.customerNameOnBill}) is not ${customer.name}. Fine for a family bill; check it is one you mean to pay.`,
    },
    f.lowBalance && { tone: 'amber', text: `Your balance would drop to ${pkr(customer.balance - payment.amount)}.` },
  ].filter(Boolean);
  if (!items.length) return null;
  const tones = { sky: 'bg-sky-50 text-sky-800', amber: 'bg-amber-50 text-amber-800' };
  return (
    <ul className="mx-4 mb-3 space-y-1.5" aria-label="Safety checks">
      {items.map((w) => (
        <li key={w.text} className={`flex gap-2 rounded-xl px-3 py-2 text-xs ${tones[w.tone]}`}>
          <span aria-hidden="true">⚠</span>
          <span>{w.text}</span>
        </li>
      ))}
    </ul>
  );
}

function Receipt({ payment }) {
  return (
    <div className="mx-4 mb-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 px-3 py-2.5 text-center">
      <p className="text-[10px] font-semibold tracking-widest text-emerald-700 uppercase">Payment receipt</p>
      <p className="mt-0.5 font-mono text-sm font-semibold text-emerald-900">{payment.receipt}</p>
      <p className="mt-0.5 text-[11px] text-emerald-700">
        {pkr(payment.amount)} · {payment.decidedAt ? timePK(payment.decidedAt) : ''} · approved by {payment.approvedBy || 'the bank'}
      </p>
    </div>
  );
}

export default function PaymentCard({ payment, customer, limit, busy, onApprove, onCancel }) {
  const s = STATUS[payment.status] || STATUS.awaiting_customer;
  const open = payment.status === 'awaiting_customer';
  const balanceAfter = customer.balance - payment.amount;
  const dimmed = ['cancelled', 'expired'].includes(payment.status);
  const left = useTimeLeft(payment.expiresAt, open);
  // Large amounts take two taps: the first arms the button, the second pays.
  // The server checks the confirmation too, so skipping this screen doesn't help.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 6000);
    return () => clearTimeout(t);
  }, [armed]);

  function approve() {
    if (payment.needsConfirm && !armed) return setArmed(true);
    setArmed(false);
    onApprove(payment.id, Boolean(payment.needsConfirm));
  }

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
      </dl>

      <div className="mx-4 mb-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <span className="font-semibold text-teal-800">Why: </span>
        {payment.saathiReason}
      </div>

      {open && <Warnings payment={payment} customer={customer} />}

      {payment.receipt && <Receipt payment={payment} />}
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
        {open && left && (
          <p className={`mt-1.5 text-center text-[11px] ${left.ms < 120000 ? 'text-rose-600' : 'text-slate-400'}`}>
            This card expires in {left.text} if not approved
          </p>
        )}
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
              onClick={approve}
              disabled={busy}
              aria-live="polite"
              className={`rounded-xl px-3 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-50 ${
                armed ? 'animate-pulse bg-amber-600 hover:bg-amber-700' : 'bg-teal-700 hover:bg-teal-800'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Shield />
                {armed ? 'Tap again' : 'Approve'}
              </span>
              <span className="urdu block text-[11px] leading-6 font-normal opacity-90">
                {armed ? 'تصدیق کے لیے دوبارہ دبائیں' : 'منظور کریں'}
              </span>
            </button>
          </div>
        )}
        {open && payment.needsConfirm && (
          <p className={`mt-1.5 text-center text-[11px] ${armed ? 'font-medium text-amber-700' : 'text-slate-400'}`}>
            {armed ? `Confirm ${pkr(payment.amount)} to ${payment.billerName}` : `${pkr(10000)} or more: you'll tap twice to confirm.`}
          </p>
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
