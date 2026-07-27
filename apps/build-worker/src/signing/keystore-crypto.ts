import { createDecipheriv } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;

/**
 * Decrypts signing secrets the API encrypted with the same
 * SIGNING_KEY_ENCRYPTION_KEY (AES-256-GCM, `iv || authTag || ciphertext`).
 * Mirrors apps/api's KeystoreCryptoService — a deliberate duplication, the
 * same anti-corruption-layer convention already used for this codebase's
 * enum mappers, since apps/api and apps/build-worker never import from
 * each other.
 */
export function decryptSigningSecret(blob: Buffer, key: Buffer): Buffer {
  const iv = blob.subarray(0, IV_LENGTH_BYTES);
  const authTag = blob.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);
  const ciphertext = blob.subarray(IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function decryptSigningSecretString(encoded: string, key: Buffer): string {
  return decryptSigningSecret(Buffer.from(encoded, 'base64'), key).toString('utf-8');
}
