import { timePK } from '../lib/format.js';

const ACTOR = {
  customer: { label: 'Customer', cls: 'bg-sky-100 text-sky-800' },
  saathi: { label: 'Saathi AI', cls: 'bg-teal-100 text-teal-800' },
  rules: { label: 'Bank rules', cls: 'bg-slate-200 text-slate-700' },
  officer: { label: 'Officer', cls: 'bg-amber-100 text-amber-800' },
  system: { label: 'System', cls: 'bg-slate-100 text-slate-500' },
};

export default function ActivityLog({ log }) {
  const entries = [...log].reverse();
  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">
        Every step, newest first, with who did it and why. Account and reference numbers are masked.
      </p>
      <ol className="space-y-2">
        {entries.map((e) => {
          const a = ACTOR[e.actor] || ACTOR.system;
          return (
            <li key={e.id} className="rounded-xl bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${a.cls}`}>{a.label}</span>
                <span className="font-mono text-[11px] text-slate-400">{timePK(e.at)}</span>
              </div>
              <p className="mt-1.5 text-sm font-medium text-slate-800">{e.action}</p>
              {e.reason && <p className="mt-0.5 text-xs text-slate-500">{e.reason}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
