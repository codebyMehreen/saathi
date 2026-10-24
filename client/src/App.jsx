import { useCallback, useEffect, useState } from 'react';
import Phone from './components/Phone.jsx';
import OfficerDesk from './components/OfficerDesk.jsx';
import ActivityLog from './components/ActivityLog.jsx';
import { api } from './lib/api.js';

export default function App() {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState('officer');
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(() => api.state().then(setState).catch(() => {}), []);

  // The officer desk and the customer's phone are two views of the same bank:
  // asking every 2 seconds keeps each in step with decisions made on the other.
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    if (!error) return undefined;
    const t = setTimeout(() => setError(''), 6000);
    return () => clearTimeout(t);
  }, [error]);

  async function run(fn) {
    setBusy(true);
    setError('');
    try {
      setState(await fn());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function send(payload) {
    setThinking(payload.image ? 'Reading your bill…' : 'Thinking…');
    // Show the customer's own message straight away, before Saathi answers.
    setState((s) => ({
      ...s,
      messages: [...s.messages, { id: 'pending', from: 'customer', text: payload.text, imageThumb: payload.imageThumb, at: new Date().toISOString() }],
    }));
    await run(() => api.chat(payload));
    setThinking('');
  }

  if (!state) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Connecting to Saathi…</div>;
  }

  const pendingCount = state.payments.filter((p) => p.status === 'pending_review').length;

  return (
    <div className="min-h-screen">
      {state.demoMode && (
        <div className="bg-amber-100 px-4 py-2 text-center text-xs text-amber-900">
          Demo mode: Gemini is not connected (no GEMINI_API_KEY), so the sample bills use stored answers.
        </div>
      )}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-5 pb-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 text-lg font-bold text-white shadow-md">
            S
          </div>
          <div>
            <h1 className="flex flex-wrap items-center gap-x-2 text-lg font-bold text-slate-900">
              Saathi <span className="urdu text-base font-normal text-teal-700">ساتھی</span>
              <span className="font-normal text-slate-400">· AI banking you approve</span>
            </h1>
            <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">Demo · no real money</span>
              Fictional Saathi Demo Bank, mock accounts
            </p>
          </div>
        </div>
        <button
          onClick={() => run(api.reset)}
          disabled={busy}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Reset demo
        </button>
      </header>

      <ol className="mx-auto mb-4 grid max-w-6xl grid-cols-2 gap-2 px-4 text-xs sm:grid-cols-4 sm:px-6">
        {[
          ['1', 'Saathi reads', 'A bill photo or a message, in Urdu, Roman Urdu or English (Gemini).'],
          ['2', 'Customer approves', `Nothing is paid until the customer taps Approve; twice from PKR ${state.confirmFrom.toLocaleString('en-US')}.`],
          ['3', 'Officer reviews', `Above PKR ${state.limit.toLocaleString('en-US')}, or past PKR ${state.dailyLimit.toLocaleString('en-US')} in a day, a bank officer decides.`],
          ['4', 'Every step logged', 'Who did what, and why. Numbers and names masked.'],
        ].map(([n, title, text]) => (
          <li key={n} className="flex gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-700 text-[11px] font-bold text-white">{n}</span>
            <span>
              <span className="font-semibold text-slate-800">{title}</span>
              <span className="hidden text-slate-500 sm:block">{text}</span>
            </span>
          </li>
        ))}
      </ol>

      {error && (
        <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4" role="alert">
          <div className="flex max-w-md items-start gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl">
            <span className="mt-0.5 text-amber-300" aria-hidden="true">⚠</span>
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="text-slate-400 hover:text-white" aria-label="Dismiss">
              ✕
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto grid max-w-6xl gap-6 px-4 pb-8 sm:px-6 lg:grid-cols-[400px_1fr]">
        <section className="flex flex-col items-center">
          <p className="mb-2 self-start text-xs font-semibold tracking-wide text-slate-400 uppercase">Customer's phone</p>
          <Phone
            state={state}
            busy={busy}
            thinking={thinking}
            onSend={send}
            onApprove={(id, confirmed) => run(() => api.approve(id, confirmed))}
            onCancel={(id) => run(() => api.cancel(id))}
            onSignIn={(pin) => run(() => api.signIn(pin))}
            onSignOut={() => run(api.signOut)}
          />
        </section>

        <section className="min-w-0">
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">Bank side</p>
          <div className="rounded-3xl bg-white/70 p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
            <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
              {[
                ['officer', 'Officer desk', pendingCount],
                ['log', 'Activity log', state.log.length],
              ].map(([id, label, count]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                    tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${
                        id === 'officer' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="max-h-[calc(100vh-13rem)] overflow-y-auto pr-1">
              {tab === 'officer' ? (
                <OfficerDesk state={state} busy={busy} onReview={(id, d, n) => run(() => api.review(id, d, n))} />
              ) : (
                <ActivityLog log={state.log} />
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
