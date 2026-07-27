import { createHash } from 'node:crypto';

/**
 * For high-entropy random tokens (refresh tokens, API keys) — not
 * passwords. A fast SHA-256 digest is the right tool here: these tokens
 * are never brute-forced offline the way user passwords are, so argon2's
 * deliberate slowness would only add unnecessary latency.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
