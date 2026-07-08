// Thin wrappers around the server's JSON endpoints (see server.py).
const authHeaders = (token) => ({ Authorization: 'Bearer ' + token });

export const checkSession = (token) =>
  fetch('/api/session', { headers: authHeaders(token) });

export const login = (password) =>
  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

export const saveSite = (token, site) =>
  fetch('/api/site', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(site),
  });

export const uploadImage = (token, dataUrl) =>
  fetch('/api/upload', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ dataUrl }),
  });

// Always re-fetch fresh (cache-busted) so the UI reflects the persisted file.
export const fetchSite = (bust) =>
  fetch('data/site.json' + (bust ? '?v=' + Date.now() : ''), { cache: 'no-store' })
    .then((r) => r.json());
