const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');
export const assetUrl = (value?: string | null) => value ? (/^https?:\/\//.test(value) ? value : `${API_ORIGIN}${value}`) : '';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function send(path: string, init: RequestInit, token: string | null) {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(!(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('lca-access-token');
  let response = await send(path, init, token);

  const refreshToken = localStorage.getItem('lca-refresh-token');
  if (response.status === 401 && refreshToken && !path.startsWith('/auth/')) {
    const refreshResponse = await send('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }, null);
    if (refreshResponse.ok) {
      const refreshed = await refreshResponse.json() as { accessToken: string; refreshToken: string };
      localStorage.setItem('lca-access-token', refreshed.accessToken);
      localStorage.setItem('lca-refresh-token', refreshed.refreshToken);
      response = await send(path, init, refreshed.accessToken);
    } else {
      localStorage.removeItem('lca-access-token');
      localStorage.removeItem('lca-refresh-token');
      localStorage.removeItem('lca-auth');
      window.dispatchEvent(new Event('lca:session-expired'));
    }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(response.status, payload.message ?? 'Erreur API');
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function apiDownload(path:string):Promise<Blob>{const token=localStorage.getItem('lca-access-token');const response=await fetch(`${API_URL}${path}`,{headers:token?{Authorization:`Bearer ${token}`}:{}});if(!response.ok)throw new ApiError(response.status,'Téléchargement impossible');return response.blob()}
