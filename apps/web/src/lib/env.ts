/**
 * Only NEXT_PUBLIC_-prefixed vars are available in the browser bundle, so
 * this is deliberately small — anything secret stays server-only and never
 * gets imported from a 'use client' file.
 */
export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api',
};
