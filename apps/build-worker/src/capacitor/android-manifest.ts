import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AndroidPermission, ScreenOrientation } from '@ag2/contracts';

/**
 * The manifest Capacitor generates has a stable, predictable shape (it's
 * our own pinned Capacitor version's output, not arbitrary third-party
 * XML), so targeted string insertion at known anchors is a deliberate
 * choice over pulling in a full XML DOM library for a handful of edits.
 */
const PERMISSION_NAMES: Record<AndroidPermission, string[]> = {
  [AndroidPermission.CAMERA]: ['android.permission.CAMERA'],
  [AndroidPermission.LOCATION]: [
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.ACCESS_COARSE_LOCATION',
  ],
  [AndroidPermission.MICROPHONE]: ['android.permission.RECORD_AUDIO'],
  [AndroidPermission.STORAGE]: [
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.WRITE_EXTERNAL_STORAGE',
  ],
  [AndroidPermission.NOTIFICATIONS]: ['android.permission.POST_NOTIFICATIONS'],
};

const ORIENTATION_VALUES: Record<ScreenOrientation, string | null> = {
  [ScreenOrientation.PORTRAIT]: 'portrait',
  [ScreenOrientation.LANDSCAPE]: 'landscape',
  [ScreenOrientation.ANY]: null,
};

export interface ManifestEditOptions {
  readonly permissions: readonly AndroidPermission[];
  readonly orientation: ScreenOrientation;
  readonly deepLinkScheme: string | null;
}

export async function editAndroidManifest(
  androidProjectDir: string,
  options: ManifestEditOptions,
): Promise<void> {
  const manifestPath = join(androidProjectDir, 'app/src/main/AndroidManifest.xml');
  let xml = await readFile(manifestPath, 'utf-8');

  xml = applyOrientation(xml, options.orientation);
  xml = applyPermissions(xml, options.permissions);
  if (options.deepLinkScheme) {
    xml = applyDeepLink(xml, options.deepLinkScheme);
  }

  await writeFile(manifestPath, xml, 'utf-8');
}

function applyOrientation(xml: string, orientation: ScreenOrientation): string {
  const value = ORIENTATION_VALUES[orientation];
  if (!value) {
    return xml;
  }

  const activityOpenTag = /<activity\b[^>]*android:name="\.MainActivity"[^>]*>/;
  const match = activityOpenTag.exec(xml);
  if (!match) {
    return xml;
  }

  const withOrientation = match[0].replace(
    '<activity',
    `<activity\n            android:screenOrientation="${value}"`,
  );
  return xml.slice(0, match.index) + withOrientation + xml.slice(match.index + match[0].length);
}

function applyPermissions(xml: string, permissions: readonly AndroidPermission[]): string {
  const names = new Set<string>();
  for (const permission of permissions) {
    for (const name of PERMISSION_NAMES[permission]) {
      names.add(name);
    }
  }
  if (names.size === 0) {
    return xml;
  }

  const lines = [...names]
    .filter((name) => !xml.includes(`"${name}"`))
    .map((name) => `    <uses-permission android:name="${name}" />`)
    .join('\n');

  if (!lines) {
    return xml;
  }

  return xml.replace('</manifest>', `${lines}\n</manifest>`);
}

function applyDeepLink(xml: string, scheme: string): string {
  const intentFilter = [
    '            <intent-filter android:autoVerify="false">',
    '                <action android:name="android.intent.action.VIEW" />',
    '                <category android:name="android.intent.category.DEFAULT" />',
    '                <category android:name="android.intent.category.BROWSABLE" />',
    `                <data android:scheme="${scheme}" />`,
    '            </intent-filter>',
  ].join('\n');

  const activityOpenTag = /<activity\b[^>]*android:name="\.MainActivity"[^>]*>/;
  const match = activityOpenTag.exec(xml);
  if (!match) {
    return xml;
  }

  const insertAt = match.index + match[0].length;
  return `${xml.slice(0, insertAt)}\n${intentFilter}${xml.slice(insertAt)}`;
}
