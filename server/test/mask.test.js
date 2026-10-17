import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maskNumber, maskName, maskText, tokenize, detokenize } from '../src/mask.js';

test('maskNumber keeps only the last 4 digits', () => {
  assert.equal(maskNumber('0123-4567-8901-4821'), '••••••••4821');
  assert.equal(maskNumber('07-13241-0567800'), '••••••••7800');
  assert.equal(maskNumber('1234'), '1234');
  assert.equal(maskNumber(null), null);
});

test('maskName keeps first name and initials', () => {
  assert.equal(maskName('Ayesha Raza'), 'Ayesha R.');
  assert.equal(maskName('Ayesha Raza Khan'), 'Ayesha R. K.');
  assert.equal(maskName('Ayesha'), 'Ayesha');
});

test('maskText hides CNIC, phone, account and reference numbers but not amounts', () => {
  const out = maskText('CNIC 35202-1234567-1, phone 0300 1234567, ref 07132410567800, pay PKR 8,450 or 25000');
  assert.ok(!out.includes('1234567-1'));
  assert.ok(!out.includes('0300 1234567'));
  assert.ok(!out.includes('07132410567800'));
  assert.ok(out.includes('7800'));
  assert.ok(out.includes('PKR 8,450'));
  assert.ok(out.includes('25000'));
});

test('dates are not masked', () => {
  assert.equal(maskText('due 2026-10-24 or 24-10-2026'), 'due 2026-10-24 or 24-10-2026');
  assert.equal(tokenize('due 2026-10-24').text, 'due 2026-10-24');
});

test('tokenize hides numbers from the AI and detokenize restores them', () => {
  const { text, vault } = tokenize('PTCL bill 0412345678 2,350 pay karo');
  assert.equal(text, 'PTCL bill [NUM1] 2,350 pay karo');
  assert.equal(detokenize('[NUM1]', vault), '0412345678');
  assert.equal(detokenize('ref [NUM9]', vault), 'ref [NUM9]');
});
