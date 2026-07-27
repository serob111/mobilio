import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { AndroidPermission, ScreenOrientation, StatusBarStyle } from '@ag2/contracts';
import { nativeRequire } from '../native-require';
import { editAndroidManifest } from './android-manifest';
import { editAppBuildGradle } from './android-gradle';
import { applySigningConfig, SigningConfigOptions } from './android-gradle-signing';
import { findGradleOutput, GradleArtifactType, runGradleBuild } from './android-gradle-build';
import { generateAndroidIcons, generateAndroidSplash, writeThemeColors } from './android-icons';
import { writeCapacitorConfig } from './capacitor-config';
import { zipDirectory } from './zip-directory';

export interface AndroidProjectOptions {
  readonly appId: string;
  readonly appName: string;
  readonly versionName: string;
  readonly versionCode: number;
  readonly sourceUrl: string;
  readonly themeColor: string;
  readonly orientation: ScreenOrientation;
  readonly statusBarStyle: StatusBarStyle;
  readonly allowedNavigationDomains: readonly string[];
  readonly deepLinkScheme: string | null;
  readonly customUserAgent: string | null;
  readonly permissions: readonly AndroidPermission[];
  readonly iconBuffer: Buffer | null;
  readonly splashBuffer: Buffer | null;
}

export interface AndroidBuildOptions {
  readonly artifactType: GradleArtifactType;
  readonly signing: SigningConfigOptions;
}

export interface AndroidProjectResult {
  readonly projectZipPath: string;
  /** Signed APK/AAB path, or null when `build` wasn't requested. */
  readonly buildOutputPath: string | null;
}

export class CapacitorCliError extends Error {}

/**
 * Generates a real, openable Capacitor Android project inside `workspace`
 * and zips it at `workspace/android-project.zip` — always, regardless of
 * `build`, so the exported project snapshot never carries Gradle build
 * output. When `build` is passed, the release keystore is then wired into
 * `app/build.gradle` and the matching Gradle task (assembleRelease /
 * bundleRelease) produces a real signed APK/AAB.
 */
export async function generateAndroidProject(
  workspace: string,
  options: AndroidProjectOptions,
  log: (line: string) => Promise<void>,
  build?: AndroidBuildOptions,
): Promise<AndroidProjectResult> {
  await writeFile(
    join(workspace, 'package.json'),
    JSON.stringify({ name: sanitizeNpmName(options.appId), version: '1.0.0', private: true }, null, 2),
    'utf-8',
  );

  const webDir = join(workspace, 'www');
  await mkdir(webDir, { recursive: true });
  await writeFile(
    join(webDir, 'index.html'),
    '<!doctype html><title>placeholder</title><p>This file is never served — the app loads the live site.</p>',
    'utf-8',
  );

  await writeCapacitorConfig(workspace, {
    appId: options.appId,
    appName: options.appName,
    sourceUrl: options.sourceUrl,
    allowedNavigationDomains: options.allowedNavigationDomains,
    statusBarStyle: options.statusBarStyle,
    themeColor: options.themeColor,
    customUserAgent: options.customUserAgent,
  });
  await log('Wrote capacitor.config.json');

  await runCapacitorCli(['add', 'android'], workspace);
  await log('Generated native Android project (npx cap add android)');

  const androidDir = join(workspace, 'android');

  await editAppBuildGradle(androidDir, {
    versionName: options.versionName,
    versionCode: options.versionCode,
  });
  await editAndroidManifest(androidDir, {
    permissions: options.permissions,
    orientation: options.orientation,
    deepLinkScheme: options.deepLinkScheme,
  });
  await writeThemeColors(androidDir, options.themeColor);
  await log('Applied version, permissions, orientation, and theme color');

  if (options.iconBuffer) {
    await generateAndroidIcons(androidDir, options.iconBuffer);
    await log('Generated launcher + adaptive icon assets from the uploaded icon');
  }
  await generateAndroidSplash(androidDir, options.splashBuffer, options.iconBuffer, options.themeColor);
  await log('Generated splash screen asset');

  const zipPath = join(workspace, 'android-project.zip');
  await zipDirectory(androidDir, zipPath);
  await log('Packaged the generated Android project');

  let buildOutputPath: string | null = null;
  if (build) {
    await applySigningConfig(androidDir, build.signing);
    await log('Applied release signing configuration');

    const gradleTask = build.artifactType === 'APK' ? 'assembleRelease' : 'bundleRelease';
    await log(`Running gradle ${gradleTask} (offline, using the pre-warmed dependency cache)…`);
    await runGradleBuild(androidDir, build.artifactType, log);
    await log(`gradle ${gradleTask} completed`);

    buildOutputPath = await findGradleOutput(androidDir, build.artifactType);
  }

  return { projectZipPath: zipPath, buildOutputPath };
}

function runCapacitorCli(args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let capacitorCliBin: string;
    try {
      const pkgPath = nativeRequire.resolve('@capacitor/cli/package.json');
      capacitorCliBin = join(dirname(pkgPath), 'bin/capacitor');
    } catch (error) {
      reject(new CapacitorCliError(`Could not locate @capacitor/cli: ${(error as Error).message}`));
      return;
    }

    const child = spawn(process.execPath, [capacitorCliBin, ...args], {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => reject(new CapacitorCliError(error.message)));
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new CapacitorCliError(
            `capacitor ${args.join(' ')} exited with code ${code}${stderr ? `: ${stderr.trim()}` : ''}`,
          ),
        );
      }
    });
  });
}

function sanitizeNpmName(appId: string): string {
  return appId.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
}
