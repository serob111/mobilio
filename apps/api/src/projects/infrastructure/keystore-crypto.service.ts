import { Inject, Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { AppEnv } from '@ag2/config';
import { APP_ENV } from '../../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;

/**
 * AES-256-GCM envelope encryption for Android signing secrets (the raw
 * keystore file and its store/key passwords) — the only material that
 * protects every app a customer has ever published to a store, so it must
 * never touch the database or object storage in plaintext. Blob layout is
 * `iv (12B) || authTag (16B) || ciphertext`.
 */
@Injectable()
export class KeystoreCryptoService {
  private readonly key: Buffer;

  constructor(@Inject(APP_ENV) env: AppEnv) {
    this.key = Buffer.from(env.SIGNING_KEY_ENCRYPTION_KEY, 'base64');
  }

  encrypt(plaintext: Buffer): Buffer {
    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
  }

  decrypt(blob: Buffer): Buffer {
    const iv = blob.subarray(0, IV_LENGTH_BYTES);
    const authTag = blob.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);
    const ciphertext = blob.subarray(IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  encryptString(plaintext: string): string {
    return this.encrypt(Buffer.from(plaintext, 'utf-8')).toString('base64');
  }

  decryptString(encoded: string): string {
    return this.decrypt(Buffer.from(encoded, 'base64')).toString('utf-8');
  }
}
