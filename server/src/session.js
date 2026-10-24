// Customer sign-in, added 24 Oct 2026. The phone side of the demo asks for a
// 4-digit PIN before Saathi will read a bill or move money. The server checks
// it: the page hiding the chat is not the protection, this is.
//
// It is a demo: one fictional customer, and the PIN is printed on the sign-in
// screen. A real bank would use its own login, device binding and OTP.

import { store, addLog } from './store.js';

export const DEMO_PIN = '1234';
export const MAX_TRIES = 3;
export const LOCK_MS = 60 * 1000;

export class SessionError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export function sessionState(now = Date.now()) {
  const s = store.session;
  const locked = Boolean(s.lockedUntil && s.lockedUntil > now);
  return {
    signedIn: s.signedIn,
    locked,
    lockSecondsLeft: locked ? Math.ceil((s.lockedUntil - now) / 1000) : 0,
    triesLeft: MAX_TRIES - s.failedTries,
  };
}

export function signIn(pin, now = Date.now()) {
  const s = store.session;
  if (s.lockedUntil && s.lockedUntil > now) {
    throw new SessionError(`Too many wrong PINs. Try again in ${Math.ceil((s.lockedUntil - now) / 1000)} seconds.`, 423);
  }
  if (s.lockedUntil) {
    s.lockedUntil = null;
    s.failedTries = 0;
  }
  if (String(pin ?? '') === DEMO_PIN) {
    s.signedIn = true;
    s.failedTries = 0;
    addLog('customer', 'Signed in to the phone app', 'Correct PIN.');
    return;
  }
  s.failedTries += 1;
  if (s.failedTries >= MAX_TRIES) {
    s.lockedUntil = now + LOCK_MS;
    addLog('rules', 'Sign-in locked for 60 seconds', `${MAX_TRIES} wrong PINs in a row.`);
    throw new SessionError('Wrong PIN 3 times. Sign-in is locked for 60 seconds.', 423);
  }
  const left = MAX_TRIES - s.failedTries;
  addLog('rules', 'Wrong PIN', `${left} ${left === 1 ? 'try' : 'tries'} left before sign-in locks.`);
  throw new SessionError(`Wrong PIN. ${left} ${left === 1 ? 'try' : 'tries'} left.`, 401);
}

export function signOut() {
  if (store.session.signedIn) addLog('customer', 'Signed out of the phone app');
  store.session.signedIn = false;
}

// Customer actions (chat, approve, cancel) need a signed-in customer.
export function requireCustomer(req, res, next) {
  if (!store.session.signedIn) return res.status(401).json({ error: 'Sign in first.' });
  next();
}
