import { useRef, useState } from 'react';
import { prepareImage } from '../lib/image.js';

const SAMPLES = [
  { id: 'electricity', label: 'Electricity bill', note: 'PKR 8,450 · pays directly', src: '/samples/electricity.svg' },
  { id: 'challan', label: 'University fee challan', note: 'PKR 85,000 · officer review', src: '/samples/fee-challan.svg' },
];

export default function ChatInput({ busy, onSend }) {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null); // { mimeType, data, thumb, sample? }
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  async function attach(source, sample = null) {
    setError('');
    setMenu(false);
    try {
      setImage({ ...(await prepareImage(source)), sample });
    } catch (err) {
      setError(err.message);
    }
  }

  async function send(e) {
    e?.preventDefault();
    if (busy || (!text.trim() && !image)) return;
    const payload = {
      text: text.trim(),
      image: image ? { mimeType: image.mimeType, data: image.data } : null,
      imageThumb: image?.thumb || null,
      sample: image?.sample || null,
    };
    setText('');
    setImage(null);
    await onSend(payload);
  }

  return (
    <form onSubmit={send} className="relative border-t border-slate-200 bg-white p-3">
      {menu && (
        <div className="absolute bottom-full left-3 right-3 mb-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
          <p className="px-2 pt-1 pb-2 text-xs font-medium text-slate-500">Try a sample bill (fictional)</p>
          {SAMPLES.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => attach(s.src, s.id)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-teal-50"
            >
              <span className="text-sm font-medium text-slate-800">{s.label}</span>
              <span className="text-xs text-slate-500">{s.note}</span>
            </button>
          ))}
        </div>
      )}

      {image && (
        <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 p-2">
          <img src={image.thumb} alt="Attached bill" className="h-14 w-14 rounded-lg object-cover" />
          <p className="flex-1 text-xs text-slate-600">Photo attached. Add a message if you like, then send.</p>
          <button type="button" onClick={() => setImage(null)} className="px-2 text-sm text-slate-500 hover:text-rose-600" aria-label="Remove photo">
            ✕
          </button>
        </div>
      )}
      {error && <p className="mb-2 text-xs text-rose-600">{error}</p>}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
          title="Attach a photo of a bill"
          aria-label="Attach a photo of a bill"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) attach(file);
          }}
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) send(e);
          }}
          rows={1}
          placeholder="Urdu, Roman Urdu or English…"
          className="max-h-28 min-h-10 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm leading-6 outline-none focus:border-teal-500 focus:bg-white"
        />
        <button
          type="submit"
          disabled={busy || (!text.trim() && !image)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white shadow hover:bg-teal-800 disabled:bg-slate-300"
          aria-label="Send"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" />
          </svg>
        </button>
      </div>
      <button
        type="button"
        onClick={() => setMenu((m) => !m)}
        className="mt-2 text-xs font-medium text-teal-700 hover:underline"
      >
        {menu ? 'Close samples' : 'Try a sample bill'}
      </button>
    </form>
  );
}
