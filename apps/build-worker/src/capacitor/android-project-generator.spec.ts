import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import unzipper from 'unzipper';
import { AndroidPermission, ScreenOrientation, StatusBarStyle } from '@ag2/contracts';
import { generateAndroidProject } from './android-project-generator';
import { createBuildWorkspace, destroyBuildWorkspace } from '../workspace/build-workspace';

async function readZipEntries(zipPath: string): Promise<Map<string, Buffer>> {
  const directory = await unzipper.Open.file(zipPath);
  const entries = new Map<string, Buffer>();
  for (const file of directory.files) {
    if (file.type === 'File') {
      entries.set(file.path, await file.buffer());
    }
  }
  return entries;
}

describe('generateAndroidProject (integration)', () => {
  jest.setTimeout(30_000);

  it('generates a real, openable Capacitor Android project with config applied', async () => {
    const workspace = await createBuildWorkspace('android-gen-test');
    const iconBuffer = await sharp({
      create: { width: 512, height: 512, channels: 4, background: { r: 220, g: 38, b: 38, alpha: 1 } },
    })
      .png()
      .toBuffer();

    const lines: string[] = [];

    try {
      const { projectZipPath: zipPath, buildOutputPath } = await generateAndroidProject(
        workspace,
        {
          appId: 'com.ag2apps.acme.myapp',
          appName: 'My Test App',
          versionName: '2.3.1',
          versionCode: 7,
          sourceUrl: 'https://example.com/app',
          themeColor: '#112233',
          orientation: ScreenOrientation.PORTRAIT,
          statusBarStyle: StatusBarStyle.DARK,
          allowedNavigationDomains: ['accounts.example.com'],
          deepLinkScheme: 'acmeapp',
          customUserAgent: 'AcmeApp/1.0',
          permissions: [AndroidPermission.CAMERA, AndroidPermission.LOCATION],
          iconBuffer,
          splashBuffer: null,
        },
        async (line) => {
          lines.push(line);
        },
      );

      // No `build` options were passed — the release Gradle build (which
      // needs a JDK + Android SDK this fast Jest run doesn't have) is
      // covered separately by the full Docker-stack verification.
      expect(buildOutputPath).toBeNull();

      const zipStat = await readFile(zipPath);
      expect(zipStat.byteLength).toBeGreaterThan(1000);

      const entries = await readZipEntries(zipPath);
      const manifest = entries.get('app/src/main/AndroidManifest.xml')?.toString('utf-8');
      expect(manifest).toBeDefined();
      expect(manifest).toContain('android:screenOrientation="portrait"');
      expect(manifest).toContain('android.permission.CAMERA');
      expect(manifest).toContain('android.permission.ACCESS_FINE_LOCATION');
      expect(manifest).toContain('android:scheme="acmeapp"');

      const gradle = entries.get('app/build.gradle')?.toString('utf-8');
      expect(gradle).toContain('versionCode 7');
      expect(gradle).toContain('versionName "2.3.1"');

      const capacitorConfig = JSON.parse(
        entries.get('app/src/main/assets/capacitor.config.json')?.toString('utf-8') ?? '{}',
      );
      expect(capacitorConfig.appId).toBe('com.ag2apps.acme.myapp');
      expect(capacitorConfig.server.url).toBe('https://example.com/app');
      expect(capacitorConfig.server.allowNavigation).toEqual(
        expect.arrayContaining(['example.com', 'accounts.example.com']),
      );
      expect(capacitorConfig.plugins.StatusBar.style).toBe('DARK');
      expect(capacitorConfig.android.appendUserAgent).toBe('AcmeApp/1.0');

      const colors = entries.get('app/src/main/res/values/colors.xml')?.toString('utf-8');
      expect(colors).toContain('#112233');

      const launcherIcon = entries.get('app/src/main/res/mipmap-xxxhdpi/ic_launcher.png');
      expect(launcherIcon).toBeDefined();
      const iconMeta = await sharp(launcherIcon).metadata();
      expect(iconMeta.width).toBe(192);
      expect(iconMeta.height).toBe(192);

      expect(lines.some((line) => line.includes('cap add android'))).toBe(true);
    } finally {
      await destroyBuildWorkspace(workspace);
    }
  });
});
