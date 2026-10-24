import { useEffect, useRef } from 'react';
import PaymentCard from './PaymentCard.jsx';
import ChatInput from './ChatInput.jsx';
import SignIn from './SignIn.jsx';
import { pkr, timePK, hasUrdu } from '../lib/format.js';

const LANGUAGE = { english: 'English', roman_urdu: 'Roman Urdu', urdu: 'Urdu' };

function Bubble({ message, children }) {
  const mine = message.from === 'customer';
  const urdu = hasUrdu(message.text);
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
        {message.imageThumb && (
          <img src={message.imageThumb} alt="Bill photo" className="mb-1 max-h-48 rounded-2xl border border-slate-200 object-cover shadow-sm" />
        )}
        {message.text && (
          <div
            dir={urdu ? 'rtl' : 'ltr'}
            className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${urdu ? 'urdu' : ''} ${
              mine ? 'rounded-br-md bg-teal-700 text-white' : 'rounded-bl-md bg-white text-slate-800'
            }`}
          >
            {message.text}
          </div>
        )}
        {children}
        {message.ai && LANGUAGE[message.language] && (
          <span className="mt-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700">
            Replied in {LANGUAGE[message.language]}
          </span>
        )}
        {message.at && <span className="mt-1 px-1 text-[10px] text-slate-400">{timePK(message.at)}</span>}
      </div>
    </div>
  );
}

export default function Phone({ state, busy, thinking, onSend, onApprove, onCancel, onSignIn, onSignOut }) {
  const { customer, messages, payments, limit, session } = state;
  const endRef = useRef(null);
  const byId = Object.fromEntries(payments.map((p) => [p.id, p]));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, thinking]);

  return (
    <div className="flex h-[min(820px,calc(100vh-7rem))] min-h-[560px] w-full max-w-[400px] flex-col overflow-hidden rounded-[2.2rem] border-[10px] border-slate-900 bg-slate-50 shadow-2xl">
      <header className="bg-teal-700 px-5 pt-4 pb-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 font-bold">S</div>
            <div>
              <p className="text-sm leading-tight font-semibold">Saathi <span className="urdu text-xs font-normal">ساتھی</span></p>
              <p className="text-[11px] text-teal-100">{customer.bank} · demo</p>
            </div>
          </div>
          {session.signedIn ? (
            <div className="flex items-center gap-2">
              <p className="text-[11px] text-teal-100">{customer.name}</p>
              <button
                onClick={onSignOut}
                disabled={busy}
                className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] text-white hover:bg-white/25"
              >
                Sign out
              </button>
            </div>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-teal-100">🔒 Signed out</span>
          )}
        </div>
        {session.signedIn && (
        <div className="mt-3 rounded-xl bg-white/10 px-3 py-2">
          <p className="text-[11px] text-teal-100">
            {customer.accountTitle} {customer.accountNumber}
          </p>
          <p className="text-xl font-bold tracking-tight" data-testid="balance">{pkr(customer.balance)}</p>
        </div>
        )}
      </header>

      {!session.signedIn ? (
        <SignIn customer={customer} session={session} busy={busy} onSignIn={onSignIn} />
      ) : (
      <>
      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4" aria-live="polite">
        <Bubble message={{ from: 'saathi', text: 'Assalam o Alaikum! Send me a photo of a bill or challan, or tell me what to pay. I will prepare it, and nothing is paid until you approve.' }} />
        {messages.map((m) => (
          <Bubble key={m.id} message={m}>
            {m.paymentId && byId[m.paymentId] && (
              <div className="w-[340px] max-w-full">
                <PaymentCard
                  payment={byId[m.paymentId]}
                  customer={customer}
                  limit={limit}
                  busy={busy}
                  onApprove={onApprove}
                  onCancel={onCancel}
                />
              </div>
            )}
          </Bubble>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-white px-4 py-2 text-sm text-slate-500 shadow-sm">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-600" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-600 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-600 [animation-delay:300ms]" />
              </span>
              {thinking}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <ChatInput busy={busy} onSend={onSend} />
      </>
      )}
    </div>
  );
}
