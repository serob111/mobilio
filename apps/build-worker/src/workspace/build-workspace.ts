import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { nativeRequire } from '../native-require';

/**
 * Android project generation shells out to the Capacitor CLI with the
 * workspace as cwd, and Capacitor resolves `@capacitor/android` (the
 * platform template) via standard Node module resolution walking up from
 * cwd — so the workspace must live *under* a directory whose node_modules
 * actually has `@capacitor/*` installed (this worker's own), not under the
 * OS temp directory, which has no relation to it.
 */
function findNodeModulesRoot(): string {
  const capacitorCliPkgPath = nativeRequire.resolve('@capacitor/cli/package.json');
  let dir = dirname(capacitorCliPkgPath);
  while (basename(dir) !== 'node_modules') {
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error('Could not locate the node_modules root above @capacitor/cli');
    }
    dir = parent;
  }
  return dirname(dir);
}

const WORKSPACE_BASE = join(findNodeModulesRoot(), '.build-workspaces');

/**
 * Each build gets its own directory so concurrent jobs (this worker runs
 * with concurrency > 1) never share filesystem state.
 */
export async function createBuildWorkspace(buildId: string): Promise<string> {
  await mkdir(WORKSPACE_BASE, { recursive: true });
  return mkdtemp(join(WORKSPACE_BASE, `ag2-build-${buildId}-`));
}

export async function destroyBuildWorkspace(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true });
}

/** Exposed for tests that want a plain OS-temp-backed workspace with no node_modules resolution requirement. */
export async function createIsolatedTempDir(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}
