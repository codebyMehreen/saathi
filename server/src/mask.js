// Personal data never leaves the server unmasked: not into the log, not into
// the page, and (for typed text) not into the AI prompt. Last 4 stay visible
// so a customer can still recognise their own bill.

const DOT = '•';

export function maskNumber(value) {
  if (value == null || value === '') return value;
  const str = String(value);
  const digits = str.replace(/\D/g, '');
  if (digits.length <= 4) return str;
  return DOT.repeat(Math.min(digits.length - 4, 8)) + digits.slice(-4);
}

// "Ayesha Raza Khan" -> "Ayesha R. K."
export function maskName(name) {
  if (!name) return name;
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return [parts[0], ...parts.slice(1).map((p) => `${p[0]}.`)].join(' ');
}

// Full names we know about (the account holder, names read off bills) are
// shortened wherever they appear in free text, e.g. in an AI reply.
export function maskNames(text, names) {
  if (!text) return text;
  let out = String(text);
  for (const name of names) {
    if (!name || !/\s/.test(name.trim())) continue;
    const pattern = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    out = out.replace(new RegExp(pattern, 'gi'), maskName(name.trim()));
  }
  return out;
}

// CNIC (12345-1234567-1), phone numbers, and any run of 7+ digits, allowing
// dashes inside ("0123-4567-8901-4821"). Amounts are always
// written with thousands separators in this app, so they are never caught.
const SENSITIVE = /\b\d{5}-\d{7}-\d\b|(?:\+92[\s-]?|\b0)3\d{2}[\s-]?\d{7}\b|\b\d(?:-?\d){6,}\b/g;

// Dates (2026-10-24, 24-10-2026) look like long numbers but are not personal.
const DATE = /^(?:\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/;

export function maskText(text) {
  if (!text) return text;
  return String(text).replace(SENSITIVE, (m) => (DATE.test(m) ? m : maskNumber(m)));
}

// Before typed text goes to the AI, long numbers are swapped for placeholders
// ([NUM1], [NUM2]...). The AI can still say "the reference is [NUM1]"; the
// server swaps the real number back in afterwards. The AI never sees it.
export function tokenize(text) {
  const vault = {};
  if (!text) return { text, vault };
  let n = 0;
  const out = String(text).replace(SENSITIVE, (m) => {
    if (DATE.test(m)) return m;
    const key = `[NUM${++n}]`;
    vault[key] = m;
    return key;
  });
  return { text: out, vault };
}

export function detokenize(value, vault) {
  if (typeof value !== 'string' || !vault) return value;
  return value.replace(/\[NUM\d+\]/g, (k) => vault[k] ?? k);
}
