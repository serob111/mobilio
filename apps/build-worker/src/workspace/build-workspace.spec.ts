import { existsSync } from 'node:fs';
import { createBuildWorkspace, destroyBuildWorkspace } from './build-workspace';

describe('build workspace', () => {
  it('creates an isolated directory per build and removes it on cleanup', async () => {
    const workspaceA = await createBuildWorkspace('build-a');
    const workspaceB = await createBuildWorkspace('build-b');

    expect(workspaceA).not.toBe(workspaceB);
    expect(existsSync(workspaceA)).toBe(true);
    expect(existsSync(workspaceB)).toBe(true);

    await destroyBuildWorkspace(workspaceA);
    expect(existsSync(workspaceA)).toBe(false);
    expect(existsSync(workspaceB)).toBe(true);

    await destroyBuildWorkspace(workspaceB);
  });

  it('does not throw when destroying a path that no longer exists', async () => {
    await expect(destroyBuildWorkspace('/tmp/ag2-build-does-not-exist')).resolves.not.toThrow();
  });
});
