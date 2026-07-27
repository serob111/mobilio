export enum ScreenOrientation {
  PORTRAIT = 'PORTRAIT',
  LANDSCAPE = 'LANDSCAPE',
  ANY = 'ANY',
}

export enum StatusBarStyle {
  DEFAULT = 'DEFAULT',
  LIGHT = 'LIGHT',
  DARK = 'DARK',
}

/**
 * Deliberately a small, curated set mapped to real Android manifest
 * permissions by the build-worker (see apps/build-worker's manifest
 * injection) — not a free-text list, so a project can never end up
 * requesting an Android permission nobody reviewed.
 */
export enum AndroidPermission {
  CAMERA = 'CAMERA',
  LOCATION = 'LOCATION',
  MICROPHONE = 'MICROPHONE',
  STORAGE = 'STORAGE',
  NOTIFICATIONS = 'NOTIFICATIONS',
}
