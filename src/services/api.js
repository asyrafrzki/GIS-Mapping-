const API_BASE = 'http://localhost:3001/api';

export async function apiRequest(path, options = {}) {
  const { token, method = 'GET', body } = options;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request gagal.');
  }

  return data;
}

export function saveSession(data) {
  localStorage.setItem('soilmap_session', JSON.stringify(data));
}

export function getSession() {
  try {
    const raw = localStorage.getItem('soilmap_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem('soilmap_session');
}