import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { StatusBarStyle } from '@ag2/contracts';

export interface CapacitorConfigOptions {
  readonly appId: string;
  readonly appName: string;
  readonly sourceUrl: string;
  readonly allowedNavigationDomains: readonly string[];
  readonly statusBarStyle: StatusBarStyle;
  readonly themeColor: string;
  readonly customUserAgent: string | null;
}

const STATUS_BAR_STYLE_VALUE: Record<StatusBarStyle, string> = {
  [StatusBarStyle.DEFAULT]: 'DEFAULT',
  [StatusBarStyle.LIGHT]: 'LIGHT',
  [StatusBarStyle.DARK]: 'DARK',
};

/**
 * `server.url` points the generated app's WebView at the *live* website
 * rather than bundling a local copy — see the build-worker README for why
 * (this is the same "hosted WebView" approach AppMySite/MobiLoud use; it's
 * the only thing that works for an arbitrary, possibly dynamic, site).
 */
export function buildCapacitorConfig(options: CapacitorConfigOptions): Record<string, unknown> {
  const sourceHost = new URL(options.sourceUrl).hostname;
  const allowNavigation = [...new Set([sourceHost, ...options.allowedNavigationDomains])];

  return {
    appId: options.appId,
    appName: options.appName,
    webDir: 'www',
    server: {
      url: options.sourceUrl,
      allowNavigation,
    },
    android: options.customUserAgent ? { appendUserAgent: options.customUserAgent } : undefined,
    plugins: {
      StatusBar: {
        style: STATUS_BAR_STYLE_VALUE[options.statusBarStyle],
        backgroundColor: options.themeColor,
      },
      SplashScreen: {
        backgroundColor: options.themeColor,
        launchAutoHide: true,
      },
    },
  };
}

export async function writeCapacitorConfig(
  workspace: string,
  options: CapacitorConfigOptions,
): Promise<void> {
  const config = buildCapacitorConfig(options);
  await writeFile(
    join(workspace, 'capacitor.config.json'),
    JSON.stringify(config, null, 2),
    'utf-8',
  );
}
