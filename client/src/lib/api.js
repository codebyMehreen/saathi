async function call(path, body) {
  const res = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  state: () => call('/state'),
  chat: (payload) => call('/chat', payload),
  approve: (id, confirmed = false) => call(`/payments/${id}/approve`, { confirmed }),
  cancel: (id) => call(`/payments/${id}/cancel`, {}),
  review: (id, decision, note) => call(`/payments/${id}/review`, { decision, note }),
  reset: () => call('/reset', {}),
  signIn: (pin) => call('/session/sign-in', { pin }),
  signOut: () => call('/session/sign-out', {}),
};
