// The mock bank. Everything lives in memory: restarting the server, or
// POST /api/reset, puts the demo back to its starting state.
// Customer and account are fictional ("Saathi Demo Bank").

import { randomUUID } from 'node:crypto';

const STARTING_BALANCE = 185000;

function fresh() {
  return {
    customer: {
      name: 'Ayesha Raza',
      bank: 'Saathi Demo Bank',
      accountTitle: 'Current Account',
      accountNumber: '0123-4567-8901-4821',
      balance: STARTING_BALANCE,
      currency: 'PKR',
    },
    messages: [],
    payments: [],
    log: [],
  };
}

export const store = fresh();

export function reset() {
  Object.assign(store, fresh());
  addLog('system', 'Demo reset', `Balance restored to PKR ${STARTING_BALANCE.toLocaleString('en-US')}.`);
}

export const newId = () => randomUUID().slice(0, 8);

export function addLog(actor, action, reason = null, paymentId = null) {
  const entry = { id: newId(), at: new Date().toISOString(), actor, action, reason, paymentId };
  store.log.push(entry);
  return entry;
}

export function addMessage(message) {
  const entry = { id: newId(), at: new Date().toISOString(), ...message };
  store.messages.push(entry);
  return entry;
}

export function findPayment(id) {
  return store.payments.find((p) => p.id === id);
}
