import { randomBytes } from 'node:crypto';

const API_KEY_PREFIX = 'ag2_live_';

export interface GeneratedApiKey {
  readonly plainText: string;
  readonly prefix: string;
}

/**
 * The prefix is stored unhashed alongside the hash so the dashboard can
 * display "ag2_live_7f3a…" without ever persisting the full secret.
 */
export function generateApiKey(): GeneratedApiKey {
  const secret = randomBytes(24).toString('base64url');
  const plainText = `${API_KEY_PREFIX}${secret}`;
  return { plainText, prefix: plainText.slice(0, API_KEY_PREFIX.length + 6) };
}
