import { useState } from 'react';
import { pkr, datePK, timePK, BILL_TYPE_LABEL } from '../lib/format.js';

function PendingItem({ payment, busy, onReview }) {
  const [note, setNote] = useState('');
  const [zoom, setZoom] = useState(false);
  return (
    <li className="rounded-2xl border-2 border-amber-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{BILL_TYPE_LABEL[payment.billType]}</p>
          <p className="font-semibold text-slate-900">{payment.billerName}</p>
          <p className="text-xs text-slate-500">
            Ref {payment.reference} · {payment.billingMonth || '—'} · due {datePK(payment.dueDate)}
          </p>
        </div>
        <p className="text-xl font-bold whitespace-nowrap text-slate-900">{pkr(payment.amount)}</p>
      </div>
      {payment.imageThumb && (
        <button
          type="button"
          onClick={() => setZoom((z) => !z)}
          className="mt-3 block overflow-hidden rounded-xl border border-slate-200"
          title={zoom ? 'Show smaller' : 'Show the bill larger'}
        >
          <img
            src={payment.imageThumb}
            alt="The bill photo the customer sent"
            className={zoom ? 'w-full max-w-sm' : 'h-24 w-24 object-cover object-top'}
          />
        </button>
      )}
      <div className="mt-3 space-y-2 text-xs">
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-slate-600">
          <span className="font-semibold text-teal-800">Saathi read: </span>
          {payment.saathiReason}
        </p>
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-800">
          <span className="font-semibold">Why it's here: </span>
          {payment.routingReason}
        </p>
        <p className="text-slate-500">Customer {payment.customerNameOnBill || ''} approved it; nothing has been paid.</p>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Note for the record. Required to reject: the customer sees it."
        className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:bg-white"
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          onClick={() => onReview(payment.id, 'reject', note)}
          disabled={busy || !note.trim()}
          title={note.trim() ? '' : 'Write a reason first'}
          className="rounded-xl border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
        >
          Reject
        </button>
        <button
          onClick={() => onReview(payment.id, 'approve', note)}
          disabled={busy}
          className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-teal-800 disabled:opacity-50"
        >
          Approve payment
        </button>
      </div>
    </li>
  );
}

export default function OfficerDesk({ state, busy, onReview }) {
  const pending = state.payments
    .filter((p) => p.status === 'pending_review')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const decided = state.payments
    .filter((p) => p.routingReason && ['paid', 'rejected'].includes(p.status))
    .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-1 text-sm font-semibold text-slate-800">Waiting for review</h3>
        <p className="mb-3 text-xs text-slate-500">
          Payments the customer approved that are above {pkr(state.limit)}, or past their {pkr(state.dailyLimit)} daily
          limit. Saathi cannot pay these; only you can.
        </p>
        {pending.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-8 text-center text-sm text-slate-500">
            Nothing waiting. Large payments the customer approves will appear here.
          </p>
        ) : (
          <ul className="space-y-3">
            {pending.map((p) => (
              <PendingItem key={p.id} payment={p} busy={busy} onReview={onReview} />
            ))}
          </ul>
        )}
      </section>

      {decided.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Decided</h3>
          <ul className="space-y-2">
            {decided.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm shadow-sm">
                <div>
                  <p className="font-medium text-slate-800">
                    {p.billerName} · {pkr(p.amount)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {timePK(p.decidedAt)} {p.officerNote ? `· “${p.officerNote}”` : ''}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    p.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {p.status === 'paid' ? 'Approved · paid' : 'Rejected'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
