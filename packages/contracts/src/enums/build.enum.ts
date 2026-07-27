export enum BuildTargetPlatform {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
}

export enum BuildArtifactType {
  APK = 'APK',
  AAB = 'AAB',
  IPA = 'IPA',
}

export enum BuildJobStatus {
  QUEUED = 'QUEUED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * MANIFEST (v1.2), ANDROID_PROJECT (v1.3, a zipped generated Capacitor
 * project) and APK/AAB (v1.4, signed release builds) are produced today.
 * IPA is reserved for v4.0 so BuildArtifact rows don't need a shape change
 * when it lands.
 */
export enum BuildArtifactKind {
  MANIFEST = 'MANIFEST',
  ANDROID_PROJECT = 'ANDROID_PROJECT',
  APK = 'APK',
  AAB = 'AAB',
  IPA = 'IPA',
}
