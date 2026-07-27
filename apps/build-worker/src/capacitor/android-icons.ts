import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const LEGACY_ICON_SIZES: Record<string, number> = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

// Adaptive-icon canvases are larger than the legacy square icon at the same
// density — Android reserves a safe zone around the visible content so the
// OS can mask/animate the icon shape. Content is scaled down within that
// canvas rather than filling it edge-to-edge.
const ADAPTIVE_FOREGROUND_SIZES: Record<string, number> = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};
const FOREGROUND_CONTENT_SCALE = 0.66;

const SPLASH_CANVAS_SIZE = 1024;
const SPLASH_CONTENT_SCALE = 0.4;

export async function generateAndroidIcons(
  androidProjectDir: string,
  iconBuffer: Buffer,
): Promise<void> {
  const resDir = join(androidProjectDir, 'app/src/main/res');

  for (const [folder, size] of Object.entries(LEGACY_ICON_SIZES)) {
    const resized = await sharp(iconBuffer)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toBuffer();
    await writeFile(join(resDir, folder, 'ic_launcher.png'), resized);
    await writeFile(join(resDir, folder, 'ic_launcher_round.png'), resized);
  }

  for (const [folder, canvasSize] of Object.entries(ADAPTIVE_FOREGROUND_SIZES)) {
    const contentSize = Math.round(canvasSize * FOREGROUND_CONTENT_SCALE);
    const content = await sharp(iconBuffer)
      .resize(contentSize, contentSize, { fit: 'cover' })
      .png()
      .toBuffer();
    const composed = await sharp({
      create: {
        width: canvasSize,
        height: canvasSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: content, gravity: 'center' }])
      .png()
      .toBuffer();
    await writeFile(join(resDir, folder, 'ic_launcher_foreground.png'), composed);
  }
}

/** Falls back to the app icon (centered on the theme color) when no splash image was uploaded, rather than leaving Capacitor's default gray placeholder. */
export async function generateAndroidSplash(
  androidProjectDir: string,
  splashBuffer: Buffer | null,
  iconBuffer: Buffer | null,
  themeColor: string,
): Promise<void> {
  const source = splashBuffer ?? iconBuffer;
  const backgroundRgb = hexToRgb(themeColor);
  const canvas = sharp({
    create: {
      width: SPLASH_CANVAS_SIZE,
      height: SPLASH_CANVAS_SIZE,
      channels: 4,
      background: { ...backgroundRgb, alpha: 1 },
    },
  });

  const output = source
    ? await canvas
        .composite([
          {
            input: await sharp(source)
              .resize(Math.round(SPLASH_CANVAS_SIZE * SPLASH_CONTENT_SCALE), undefined, {
                fit: 'inside',
              })
              .png()
              .toBuffer(),
            gravity: 'center',
          },
        ])
        .png()
        .toBuffer()
    : await canvas.png().toBuffer();

  await writeFile(
    join(androidProjectDir, 'app/src/main/res/drawable/splash.png'),
    output,
  );
}

export async function writeThemeColors(androidProjectDir: string, themeColor: string): Promise<void> {
  const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">${themeColor}</color>
    <color name="colorPrimaryDark">${themeColor}</color>
    <color name="colorAccent">${themeColor}</color>
</resources>
`;
  await writeFile(
    join(androidProjectDir, 'app/src/main/res/values/colors.xml'),
    colorsXml,
    'utf-8',
  );

  // `ic_launcher_background` is already declared by Capacitor's own
  // generated `res/values/ic_launcher_background.xml` (the adaptive icon
  // background color) — redeclaring it in colors.xml above would be a
  // duplicate resource and fail AAPT2 merging, so this file is overwritten
  // in place instead of adding a second definition.
  const iconBackgroundXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${themeColor}</color>
</resources>
`;
  await writeFile(
    join(androidProjectDir, 'app/src/main/res/values/ic_launcher_background.xml'),
    iconBackgroundXml,
    'utf-8',
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized;
  const num = Number.parseInt(value, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
