const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

const defaultHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
};

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null);
  if (!entries.length) {
    return '';
  }
  const query = new URLSearchParams();
  entries.forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    } else {
      query.set(key, String(value));
    }
  });
  return `?${query.toString()}`;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      ...defaultHeaders,
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({ message: response.statusText }));
    const error = new Error(errorPayload.message ?? 'Une erreur est survenue');
    error.status = response.status;
    error.payload = errorPayload;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return text;
  }
}

export function get(path, params) {
  return request(`${path}${buildQuery(params)}`);
}

export function post(path, body) {
  return request(path, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}

export function patch(path, body) {
  return request(path, {
    method: 'PATCH',
    body: JSON.stringify(body ?? {}),
  });
}

export function put(path, body) {
  return request(path, {
    method: 'PUT',
    body: JSON.stringify(body ?? {}),
  });
}

export function del(path) {
  return request(path, { method: 'DELETE' });
}

export function buildApiUrl(path = '') {
  return `${API_URL}${path}`;
}

export default {
  get,
  post,
  patch,
  put,
  del,
  buildApiUrl,
};
