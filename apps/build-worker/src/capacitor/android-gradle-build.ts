import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

export class GradleBuildError extends Error {}

const GRADLE_TASK_BY_ARTIFACT = {
  APK: 'assembleRelease',
  AAB: 'bundleRelease',
} as const;

const OUTPUT_DIR_BY_ARTIFACT = {
  APK: 'app/build/outputs/apk/release',
  AAB: 'app/build/outputs/bundle/release',
} as const;

const OUTPUT_EXTENSION_BY_ARTIFACT = {
  APK: '.apk',
  AAB: '.aab',
} as const;

export type GradleArtifactType = keyof typeof GRADLE_TASK_BY_ARTIFACT;

/**
 * Runs the release Gradle task inside the generated Android project.
 * `--offline` is mandatory: this environment's build-worker containers have
 * no outbound network access at runtime, and the Docker image bakes in a
 * pre-warmed Gradle dependency cache specifically so this still works (see
 * docker/build-worker.Dockerfile's warm-up step).
 */
export function runGradleBuild(
  androidProjectDir: string,
  artifactType: GradleArtifactType,
  log: (line: string) => Promise<void>,
): Promise<void> {
  const task = GRADLE_TASK_BY_ARTIFACT[artifactType];

  return new Promise((resolve, reject) => {
    const child = spawn('sh', ['gradlew', task, '--offline', '--no-daemon', '--stacktrace'], {
      cwd: androidProjectDir,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderrTail = '';
    child.stdout.on('data', (chunk: Buffer) => {
      void log(chunk.toString()).catch(() => undefined);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-4000);
    });

    child.on('error', (error) => reject(new GradleBuildError(error.message)));
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new GradleBuildError(
            `gradle ${task} exited with code ${code}${stderrTail ? `: ${stderrTail}` : ''}`,
          ),
        );
      }
    });
  });
}

/** Locates the single release APK/AAB Gradle just produced. */
export async function findGradleOutput(
  androidProjectDir: string,
  artifactType: GradleArtifactType,
): Promise<string> {
  const dir = join(androidProjectDir, OUTPUT_DIR_BY_ARTIFACT[artifactType]);
  const extension = OUTPUT_EXTENSION_BY_ARTIFACT[artifactType];
  const entries = await readdir(dir);
  const match = entries.find((entry) => entry.endsWith(extension));
  if (!match) {
    throw new GradleBuildError(`No ${extension} file found in ${dir}`);
  }
  return join(dir, match);
}
