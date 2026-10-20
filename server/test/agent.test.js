// The Gemini call, with fetch replaced by a fake: no network, no key needed.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { askSaathi, AgentError } from '../src/agent.js';

const customer = { accountTitle: 'Current Account', accountNumber: '0123-4567-8901-4821', balance: 185000 };
const realFetch = globalThis.fetch;
let calls;

const answer = {
  language: 'roman_urdu',
  intent: 'pay_bill',
  reply: 'Bill [NUM1] parh liya.',
  reason: 'Read a PTCL bill [NUM1].',
  bill: { billerName: 'PTCL', reference: '[NUM1]', amountWithinDue: 2350 },
  missing: [],
};
const ok = () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] } }] }), { status: 200 });
const fail = (status, message = 'x') => new Response(JSON.stringify({ error: { message } }), { status });

function fakeFetch(...responses) {
  calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push(JSON.parse(init.body));
    return responses.shift()();
  };
}

beforeEach(() => {
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_RETRY_MS = '0';
});
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.GEMINI_API_KEY;
});

test('typed numbers reach Gemini only as placeholders and come back real', async () => {
  fakeFetch(ok);
  const a = await askSaathi({ text: 'PTCL bill 0412345678 2,350 pay karo', customer });
  const prompt = calls[0].contents[0].parts[0].text;
  assert.ok(!prompt.includes('0412345678'));
  assert.ok(!prompt.includes('0123-4567-8901-4821'));
  assert.ok(prompt.includes('[NUM1]'));
  assert.equal(a.bill.reference, '0412345678');
  assert.equal(a.reason, 'Read a PTCL bill 0412345678.');
});

test('one retry when Gemini is briefly overloaded', async () => {
  fakeFetch(() => fail(503), ok);
  const a = await askSaathi({ text: 'pay', customer });
  assert.equal(calls.length, 2);
  assert.equal(a.intent, 'pay_bill');
});

test('a second failure, a bad key or a quota error is reported in plain words', async () => {
  fakeFetch(() => fail(503), () => fail(503));
  await assert.rejects(askSaathi({ text: 'pay', customer }), /busy right now/);
  fakeFetch(() => fail(400, 'API key not valid. Please pass a valid API key.'));
  await assert.rejects(askSaathi({ text: 'pay', customer }), /key is not valid/);
  assert.equal(calls.length, 1, 'no retry on a bad key');
  fakeFetch(() => fail(429));
  await assert.rejects(askSaathi({ text: 'pay', customer }), AgentError);
});
