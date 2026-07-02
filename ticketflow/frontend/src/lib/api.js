// Client API centralizzato. Tutte le chiamate passano dal gateway (/api).
const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const TOKEN_KEY = 'tf_token';
const USER_KEY = 'tf_user';

export const auth = {
  get token() {
    return localStorage.getItem(TOKEN_KEY);
  },
  get user() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  save(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

async function request(path, { method = 'GET', body, authed = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authed && auth.token) headers.Authorization = `Bearer ${auth.token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.detail || `Errore ${res.status}`);
  }
  return data;
}

export const api = {
  // Auth
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),

  // Eventi
  listEvents: () => request('/events/'),
  createEvent: (payload) => request('/events/', { method: 'POST', body: payload, authed: true }),
  updateEvent: (id, payload) =>
    request(`/events/${id}`, { method: 'PUT', body: payload, authed: true }),
  deleteEvent: (id) => request(`/events/${id}`, { method: 'DELETE', authed: true }),

  // Ordini
  listOrders: () => request('/orders/', { authed: true }),
  createOrder: (payload) => request('/orders/', { method: 'POST', body: payload, authed: true }),

  // Notifiche
  listNotifications: () => request('/notifications/', { authed: true }),
};

export const euro = (cents) => (cents / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
export const formatDate = (iso) =>
  new Date(iso).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' });
