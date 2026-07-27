import { CookieOptions } from 'express';
import { AppEnv } from '@ag2/config';

export function refreshTokenCookieOptions(env: AppEnv, maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: maxAgeMs,
  };
}

export function csrfTokenCookieOptions(env: AppEnv, maxAgeMs: number): CookieOptions {
  return {
    // Not scoped to /api/auth like the refresh cookie: the dashboard's
    // client-side JS reads this via document.cookie from whatever page
    // it's on, so it needs to be visible repo-wide.
    httpOnly: false,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: maxAgeMs,
  };
}
