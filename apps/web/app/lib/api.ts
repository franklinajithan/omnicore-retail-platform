const configuredApiUrl =
  process.env.NEXT_PUBLIC_OMNICORE_API_URL ||
  process.env.NEXT_PUBLIC_API_URL;

const API_URL = configuredApiUrl || (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '');

interface RequestOptions extends RequestInit { token?: string; }

async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  if (!API_URL) {
    throw new Error('OmniCore API is not configured for this environment');
  }
  const { token, ...fetchOptions } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (fetchOptions.headers) Object.assign(headers, fetchOptions.headers);
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL.replace(/\/$/, '')}${endpoint}`, { ...fetchOptions, headers });
  } catch {
    throw new Error('Unable to connect to OmniCore API');
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Request failed (${response.status})`);
  }
  return response.json();
}

export const api = {
  get: <T>(endpoint: string, token?: string) => apiRequest<T>(endpoint, { method: 'GET', token }),
  post: <T>(endpoint: string, data: unknown, token?: string) => apiRequest<T>(endpoint, { method: 'POST', body: JSON.stringify(data), token }),
  patch: <T>(endpoint: string, data: unknown, token?: string) => apiRequest<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data), token }),
  delete: <T>(endpoint: string, token?: string) => apiRequest<T>(endpoint, { method: 'DELETE', token }),
};
