const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '');
export const USE_DEMO_DATA = import.meta.env.VITE_USE_DEMO_DATA === 'true';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  token?: string | null;
};

export const resolveApiUrl = (path: string) => {
  if (!API_BASE_URL && !USE_DEMO_DATA) {
    throw new Error('VITE_API_BASE_URL is not configured. Set it or enable demo data.');
  }
  return `${API_BASE_URL ?? ''}${path}`;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (USE_DEMO_DATA) {
    throw new Error('Network request blocked: running in demo data mode.');
  }

  const { method = 'GET', body, token } = options;
  const response = await fetch(resolveApiUrl(path), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json()) as T;
  return data;
}
