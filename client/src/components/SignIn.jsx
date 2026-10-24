import { useEffect, useRef, useState } from 'react';

// The phone app's sign-in. The server checks the PIN (server/src/session.js);
// this screen only collects it. Demo: the PIN is printed below the boxes.
export default function SignIn({ customer, session, busy, onSignIn }) {
  const [pin, setPin] = useState('');
  const inputRef = useRef(null);
  useEffect(() => inputRef.current?.focus(), []);

  function submit(e) {
    e.preventDefault();
    if (pin.length !== 4 || busy || session.locked) return;
    onSignIn(pin);
    setPin('');
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-600 to-teal-800 text-2xl font-bold text-white shadow-lg">
        S
      </div>
      <p className="mt-4 text-lg font-semibold text-slate-900">Welcome back, {customer.name}</p>
      <p className="text-xs text-slate-500">
        {customer.bank} · {customer.accountTitle} {customer.accountNumber.slice(-6)}
      </p>

      <label htmlFor="pin" className="mt-8 text-sm font-medium text-slate-700">
        Enter your 4-digit PIN
      </label>
      <div className="relative mt-3" onClick={() => inputRef.current?.focus()}>
        <div className="flex gap-3" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`flex h-12 w-11 items-center justify-center rounded-xl border-2 bg-white text-2xl ${
                i === pin.length ? 'border-teal-600' : 'border-slate-200'
              }`}
            >
              {pin[i] ? '•' : ''}
            </span>
          ))}
        </div>
        <input
          ref={inputRef}
          id="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={pin}
          disabled={session.locked}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="absolute inset-0 opacity-0"
        />
      </div>

      <button
        type="submit"
        disabled={pin.length !== 4 || busy || session.locked}
        className="mt-6 w-full max-w-[220px] rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-teal-800 disabled:opacity-40"
      >
        Sign in <span className="urdu font-normal">· سائن ان</span>
      </button>

      {session.locked ? (
        <p className="mt-4 text-xs font-medium text-rose-600">Locked after 3 wrong PINs. Try again in {session.lockSecondsLeft} s.</p>
      ) : session.triesLeft < 3 ? (
        <p className="mt-4 text-xs text-amber-700">{session.triesLeft} {session.triesLeft === 1 ? 'try' : 'tries'} left before sign-in locks.</p>
      ) : null}

      <p className="mt-6 rounded-full bg-amber-50 px-3 py-1 text-[11px] text-amber-800">Demo PIN: 1234</p>
    </form>
  );
}
