import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface SigningConfigOptions {
  readonly keystoreBuffer: Buffer;
  readonly storePassword: string;
  readonly keyPassword: string;
  readonly keyAlias: string;
}

const KEYSTORE_FILENAME = 'release.keystore.p12';

/**
 * Writes the decrypted keystore into the app module and wires it into
 * `app/build.gradle`'s release signingConfig. The keystore file only exists
 * on disk for the lifetime of this isolated build workspace — the whole
 * workspace (including this file) is destroyed once the build finishes,
 * win or lose.
 */
export async function applySigningConfig(
  androidProjectDir: string,
  options: SigningConfigOptions,
): Promise<void> {
  const appDir = join(androidProjectDir, 'app');
  await writeFile(join(appDir, KEYSTORE_FILENAME), options.keystoreBuffer);

  const gradlePath = join(appDir, 'build.gradle');
  let gradle = await readFile(gradlePath, 'utf-8');

  const signingConfigsBlock = `    signingConfigs {
        release {
            storeFile file("${KEYSTORE_FILENAME}")
            storePassword "${options.storePassword}"
            keyAlias "${options.keyAlias}"
            keyPassword "${options.keyPassword}"
            storeType "PKCS12"
        }
    }
    buildTypes {`;
  gradle = gradle.replace('    buildTypes {', signingConfigsBlock);

  gradle = gradle.replace(
    /release\s*\{\s*\n(\s*)minifyEnabled/,
    (_match, indent: string) => `release {\n${indent}signingConfig signingConfigs.release\n${indent}minifyEnabled`,
  );

  await writeFile(gradlePath, gradle, 'utf-8');
}
