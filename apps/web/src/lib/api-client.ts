import { env } from './env';
import { getCookie } from './cookies';

const CSRF_TOKEN_COOKIE = 'ag2_csrf_token';
const CSRF_TOKEN_HEADER = 'x-csrf-token';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: {
      message?: string | string[];
      error?: string;
    } | null,
  ) {
    super(
      Array.isArray(body?.message)
        ? body.message.join(', ')
        : (body?.message ?? `Request failed with status ${status}`),
    );
    this.name = 'ApiError';
  }
}

let accessToken: string | null = null;
type AccessTokenListener = (token: string | null) => void;
const listeners = new Set<AccessTokenListener>();

export function setAccessToken(token: string | null): void {
  accessToken = token;
  for (const listener of listeners) {
    listener(token);
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function onAccessTokenChange(listener: AccessTokenListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

interface RefreshResponse {
  accessToken: string;
}

let refreshPromise: Promise<boolean> | null = null;

/** Uses the httpOnly refresh cookie to obtain a new access token. */
export function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const csrfToken = getCookie(CSRF_TOKEN_COOKIE);
      const res = await fetch(`${env.apiUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: csrfToken ? { [CSRF_TOKEN_HEADER]: csrfToken } : undefined,
      });

      if (!res.ok) {
        setAccessToken(null);
        return false;
      }

      const data = (await res.json()) as RefreshResponse;
      setAccessToken(data.accessToken);
      return true;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export function logoutSession(): Promise<Response> {
  const csrfToken = getCookie(CSRF_TOKEN_COOKIE);
  setAccessToken(null);
  return fetch(`${env.apiUrl}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: csrfToken ? { [CSRF_TOKEN_HEADER]: csrfToken } : undefined,
  });
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuthRetry?: boolean;
}

async function rawFetch(
  path: string,
  options: ApiFetchOptions,
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return fetch(`${env.apiUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

async function fetchWithAuthRetry(
  path: string,
  options: ApiFetchOptions,
): Promise<Response> {
  let res = await rawFetch(path, options);

  if (res.status === 401 && !options.skipAuthRetry) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await rawFetch(path, options);
    }
  }

  if (!res.ok) {
    let body: { message?: string | string[]; error?: string } | null = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    throw new ApiError(res.status, body);
  }

  return res;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const res = await fetchWithAuthRetry(path, options);

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

/** For the handful of endpoints (e.g. build logs) that return `text/plain` instead of JSON. */
export async function apiFetchText(
  path: string,
  options: ApiFetchOptions = {},
): Promise<string> {
  const res = await fetchWithAuthRetry(path, options);
  return res.text();
}

/** For binary downloads (e.g. a signing keystore backup) that need the Authorization header — a plain `<a href>` can't attach it. */
export async function apiFetchBlob(
  path: string,
  options: ApiFetchOptions = {},
): Promise<{ blob: Blob; filename: string | null }> {
  const res = await fetchWithAuthRetry(path, options);
  const disposition = res.headers.get('content-disposition');
  const filename = disposition?.match(/filename="?([^"]+)"?/)?.[1] ?? null;
  return { blob: await res.blob(), filename };
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  getText: (path: string) => apiFetchText(path),
  getBlob: (path: string) => apiFetchBlob(path),
  post: <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
