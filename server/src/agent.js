// Saathi's AI part. Gemini reads the bill photo and/or message and answers in
// a fixed JSON shape. It explains; it never decides. Every money decision is
// made afterwards by rules.js.

import { tokenize, detokenize, maskNumber } from './mask.js';
import { todayPK, pkr } from './rules.js';
import { sampleAnswer } from './samples.js';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export const geminiConfigured = () => Boolean(process.env.GEMINI_API_KEY?.trim());
const model = () => process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite';

export class AgentError extends Error {}

const BILL_TYPES = ['electricity', 'gas', 'water', 'internet_phone', 'fee_challan', 'government_challan', 'other'];

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    language: { type: 'STRING', enum: ['english', 'roman_urdu', 'urdu'] },
    intent: { type: 'STRING', enum: ['pay_bill', 'balance', 'greeting', 'other'] },
    reply: { type: 'STRING' },
    reason: { type: 'STRING' },
    bill: {
      type: 'OBJECT',
      nullable: true,
      properties: {
        billerName: { type: 'STRING', nullable: true },
        billType: { type: 'STRING', enum: BILL_TYPES, nullable: true },
        reference: { type: 'STRING', nullable: true },
        customerNameOnBill: { type: 'STRING', nullable: true },
        billingMonth: { type: 'STRING', nullable: true },
        dueDate: { type: 'STRING', nullable: true },
        amountWithinDue: { type: 'NUMBER', nullable: true },
        amountAfterDue: { type: 'NUMBER', nullable: true },
      },
    },
    missing: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['language', 'intent', 'reply', 'reason', 'missing'],
};

function instructions({ customer, today, hasImage, text }) {
  return `You are Saathi, the assistant of "Saathi Demo Bank" (a fictional demo bank) in Pakistan.
You help a customer pay utility bills and challans. You only READ and PREPARE. You never pay,
approve or promise anything: the customer must tap Approve, and large payments go to a bank officer.

Today's date in Pakistan: ${today}.
Customer's account: ${customer.accountTitle} ending ${maskNumber(customer.accountNumber)}, balance ${pkr(customer.balance)}.

Language: detect the language of the customer's MESSAGE (not of the bill):
- "urdu" if written in Urdu script, "roman_urdu" if Urdu written in Latin letters (e.g. "ye bill pay kar do"),
  "english" otherwise or if there is no message. Write "reply" in that same language and script.

Intent:
- "pay_bill" if they send a bill/challan photo or ask to pay a bill.
- "balance" if they ask about their balance (answer it in "reply" from the account above).
- "greeting" or "other" otherwise (reply briefly and say you can read a bill photo and prepare the payment).

For "pay_bill", fill "bill" with exactly what is printed; never guess numbers:
- billerName: company or institution receiving the payment.
- billType: one of ${BILL_TYPES.join(', ')}.
- reference: the consumer / reference / challan / PSID number exactly as printed (digits and dashes).
  Typed numbers may appear as placeholders like [NUM1]; copy the placeholder as-is.
- customerNameOnBill, billingMonth (e.g. "September 2026"), dueDate as YYYY-MM-DD.
- amountWithinDue: payable within due date; amountAfterDue: payable after due date (null if not printed). Plain numbers in PKR.
- List anything you could not read in "missing" (e.g. "amount", "reference"). If the image is not a bill, set intent "other".
For "pay_bill", "reply" is ONE or TWO short sentences: what you found and that the card below needs their approval.
Never say it is paid. If amount or reference is missing, ask for a clearer photo or for them to type it.

"reason": one short sentence in English for the bank's audit log explaining what you read and why you prepared
(or did not prepare) a payment, e.g. "Read an electricity bill for September 2026, PKR 8,450 due 24 Oct; customer asked to pay it."

${hasImage ? 'The customer attached a photo.' : 'No photo attached.'}
Customer's message: ${text ? JSON.stringify(text) : '(none)'}`;
}

export async function askSaathi({ text, image, sample, customer }) {
  const today = todayPK();

  if (!geminiConfigured()) {
    const answer = sampleAnswer(sample, text, customer);
    if (answer) return { ...answer, demo: true };
    throw new AgentError(
      'Gemini is not connected (no GEMINI_API_KEY), so I can only read the sample bills in demo mode.'
    );
  }

  const { text: safeText, vault } = tokenize(text?.trim() || '');
  const parts = [{ text: instructions({ customer, today, hasImage: Boolean(image), text: safeText }) }];
  if (image) parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });

  let response;
  try {
    response = await fetch(`${ENDPOINT}/${model()}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY.trim() },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: SCHEMA },
      }),
      signal: AbortSignal.timeout(45000),
    });
  } catch (err) {
    throw new AgentError(`Could not reach Gemini (${err.name === 'TimeoutError' ? 'timed out' : err.message}).`);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.error?.message || `HTTP ${response.status}`;
    if (response.status === 429) throw new AgentError('Gemini free allowance is used up for the moment (429).');
    if (/API key not valid/i.test(detail)) throw new AgentError('The Gemini API key is not valid.');
    throw new AgentError(`Gemini refused the request: ${detail}`);
  }

  const raw = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  let answer;
  try {
    answer = JSON.parse(raw);
  } catch {
    throw new AgentError('Gemini returned something that was not readable JSON.');
  }

  // Put the customer's real numbers back where the AI used placeholders.
  if (answer.bill) {
    for (const key of Object.keys(answer.bill)) answer.bill[key] = detokenize(answer.bill[key], vault);
  }
  answer.reply = detokenize(answer.reply, vault);
  answer.reason = detokenize(answer.reason, vault);
  answer.missing ??= [];
  return { ...answer, demo: false };
}
