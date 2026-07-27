import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function editAppBuildGradle(
  androidProjectDir: string,
  options: { versionName: string; versionCode: number },
): Promise<void> {
  const gradlePath = join(androidProjectDir, 'app/build.gradle');
  let gradle = await readFile(gradlePath, 'utf-8');

  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${options.versionCode}`);
  gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${options.versionName}"`);

  await writeFile(gradlePath, gradle, 'utf-8');
}
