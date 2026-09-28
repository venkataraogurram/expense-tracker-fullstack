// Thin wrapper around fetch() for the Spring Boot REST API.
// All paths are relative, so the same code works in dev (Vite proxy) and prod.

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (res.status === 204) return null;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(body?.error || `Request failed (${res.status})`);
    err.details = body?.details || null;
    throw err;
  }
  return body;
}

function query(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  categories: () => request('/api/categories'),
  list: (filters) => request(`/api/expenses${query(filters)}`),
  summary: (filters) => request(`/api/expenses/summary${query(filters)}`),
  create: (expense) => request('/api/expenses', { method: 'POST', body: JSON.stringify(expense) }),
  update: (id, expense) => request(`/api/expenses/${id}`, { method: 'PUT', body: JSON.stringify(expense) }),
  remove: (id) => request(`/api/expenses/${id}`, { method: 'DELETE' }),
};
