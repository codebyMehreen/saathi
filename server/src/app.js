import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { store, reset, addLog, addMessage, findPayment } from './store.js';
import { preparePayment, onCustomerApprove, onCustomerCancel, review, approvalLimit, RuleError } from './rules.js';
import { askSaathi, geminiConfigured, AgentError } from './agent.js';
import { statusMessage } from './messages.js';
import { maskNumber, maskName, maskText } from './mask.js';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Everything the page sees goes through here, so nothing leaves unmasked.
export function publicState() {
  const c = store.customer;
  return {
    demoMode: !geminiConfigured(),
    limit: approvalLimit(),
    customer: { ...c, accountNumber: maskNumber(c.accountNumber), name: maskName(c.name) },
    messages: store.messages.map((m) => ({ ...m, text: maskText(m.text) })),
    payments: store.payments.map((p) => ({
      ...p,
      reference: maskNumber(p.reference),
      customerNameOnBill: maskName(p.customerNameOnBill),
      officerNote: maskText(p.officerNote),
    })),
    log: store.log.map((e) => ({ ...e, action: maskText(e.action), reason: maskText(e.reason) })),
  };
}

function describeRequest(text, image) {
  const quoted = text ? `"${maskText(text).slice(0, 120)}"` : '';
  if (image) return quoted ? `Sent a bill photo with the message ${quoted}` : 'Sent a bill photo';
  return `Sent a message: ${quoted}`;
}

async function handleChat(req, res) {
  const { text = '', image = null, sample = null, imageThumb = null } = req.body || {};
  const cleanText = String(text).trim().slice(0, 1000);

  if (!cleanText && !image) return res.status(400).json({ error: 'Send a message or a photo.' });
  if (image && (!IMAGE_TYPES.includes(image.mimeType) || typeof image.data !== 'string')) {
    return res.status(400).json({ error: 'The photo must be a JPEG, PNG or WebP image.' });
  }

  addMessage({ from: 'customer', text: cleanText, imageThumb: typeof imageThumb === 'string' ? imageThumb : null });
  addLog('customer', describeRequest(cleanText, image));

  let answer;
  try {
    answer = await askSaathi({ text: cleanText, image, sample, customer: store.customer });
  } catch (err) {
    if (!(err instanceof AgentError)) throw err;
    addLog('system', 'Saathi could not read the request', err.message);
    addMessage({ from: 'saathi', text: statusMessage('error'), language: 'english' });
    return res.json(publicState());
  }

  const { language, intent, reply, reason, bill, missing } = answer;
  const amount = Number(bill?.amountWithinDue) || Number(bill?.amountAfterDue);

  if (intent === 'pay_bill' && bill?.reference && amount > 0) {
    addLog('saathi', `Read the bill: ${bill.billerName || 'unknown biller'}`, reason);
    const payment = preparePayment(bill, { language, saathiReason: reason });
    addMessage({ from: 'saathi', text: reply, language, paymentId: payment.id });
  } else {
    const why = intent === 'pay_bill' ? `Could not prepare a payment (missing: ${missing.join(', ') || 'details'})` : `Answered (${intent})`;
    addLog('saathi', why, reason);
    addMessage({ from: 'saathi', text: reply, language });
  }
  res.json(publicState());
}

function paymentAction(fn) {
  return (req, res) => {
    const payment = findPayment(req.params.id);
    if (!payment) return res.status(404).json({ error: 'No such payment.' });
    try {
      fn(payment, req.body || {});
    } catch (err) {
      if (err instanceof RuleError) return res.status(409).json({ error: err.message });
      throw err;
    }
    res.json(publicState());
  };
}

// After a decision, Saathi tells the customer in the language they used.
function tellCustomer(payment) {
  const kind = payment.status;
  if (['paid', 'pending_review', 'rejected', 'cancelled'].includes(kind)) {
    addMessage({ from: 'saathi', text: statusMessage(kind, payment, payment.language), language: payment.language, paymentId: null });
  }
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '8mb' }));

  app.get('/api/state', (req, res) => res.json(publicState()));
  app.post('/api/chat', handleChat);

  app.post('/api/payments/:id/approve', paymentAction((p) => tellCustomer(onCustomerApprove(p))));
  app.post('/api/payments/:id/cancel', paymentAction((p) => tellCustomer(onCustomerCancel(p))));
  app.post('/api/payments/:id/review', paymentAction((p, body) => tellCustomer(review(p, body.decision, body.note))));

  app.post('/api/reset', (req, res) => {
    reset();
    res.json(publicState());
  });

  // Production: serve the built page.
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use((err, req, res, next) => {
    console.error(err);
    addLog('system', 'Server error', err.message);
    res.status(500).json({ error: 'Something went wrong on the server.' });
  });

  return app;
}

