import { PrismaClient } from '@ag2/database';
import { IObjectStorage } from '@ag2/storage';
import { decryptSigningSecret, decryptSigningSecretString } from './keystore-crypto';

export interface SigningMaterial {
  readonly keyAlias: string;
  readonly keystoreBuffer: Buffer;
  readonly storePassword: string;
  readonly keyPassword: string;
}

export class SigningMaterialError extends Error {}

/** Downloads the project's encrypted keystore from storage and decrypts it (and its passwords) in memory — nothing here ever touches disk. */
export async function loadSigningMaterial(
  prisma: PrismaClient,
  objectStorage: IObjectStorage,
  encryptionKey: Buffer,
  projectId: string,
): Promise<SigningMaterial> {
  const signingKey = await prisma.signingKey.findUnique({ where: { projectId } });
  if (!signingKey) {
    throw new SigningMaterialError(
      `Project ${projectId} has no signing key — cannot produce a signed release build`,
    );
  }

  const url = await objectStorage.getSignedDownloadUrl(signingKey.keystoreStorageKey, 60);
  const response = await fetch(url);
  if (!response.ok) {
    throw new SigningMaterialError(`Failed to download keystore: HTTP ${response.status}`);
  }
  const encryptedKeystore = Buffer.from(await response.arrayBuffer());

  return {
    keyAlias: signingKey.alias,
    keystoreBuffer: decryptSigningSecret(encryptedKeystore, encryptionKey),
    storePassword: decryptSigningSecretString(signingKey.storePasswordEncrypted, encryptionKey),
    keyPassword: decryptSigningSecretString(signingKey.keyPasswordEncrypted, encryptionKey),
  };
}
