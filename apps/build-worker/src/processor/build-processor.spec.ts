import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { Job } from 'bullmq';
import { Logger } from 'pino';
import {
  BuildArtifactType,
  BuildJobPayload,
  BuildJobStatus,
  BuildTargetPlatform,
  ProjectSourceType,
} from '@ag2/contracts';
import {
  AndroidPermission,
  BuildJobStatus as PrismaBuildJobStatus,
  ScreenOrientation,
  StatusBarStyle,
} from '@ag2/database';
import { processBuildJob } from './build-processor';
import * as siteFetcher from '../site/site-fetcher';
import * as androidGenerator from '../capacitor/android-project-generator';
import * as signingMaterial from '../signing/load-signing-material';

function makeProjectConfig() {
  return {
    id: 'config-1',
    projectId: 'project-1',
    appName: 'My App',
    packageName: 'com.ag2apps.acme.myapp',
    versionName: '1.0.0',
    versionCode: 1,
    iconStorageKey: null,
    splashStorageKey: null,
    themeColor: '#4F46E5',
    orientation: ScreenOrientation.ANY,
    statusBarStyle: StatusBarStyle.DEFAULT,
    allowedNavigationDomains: [] as string[],
    deepLinkScheme: null,
    customUserAgent: null,
    permissions: [] as AndroidPermission[],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makePayload(overrides: Partial<BuildJobPayload> = {}): BuildJobPayload {
  return {
    buildId: 'build-1',
    projectId: 'project-1',
    organizationId: 'org-1',
    triggeredByUserId: 'user-1',
    platform: BuildTargetPlatform.ANDROID,
    artifactType: BuildArtifactType.APK,
    projectSourceType: ProjectSourceType.URL,
    projectSourceUrl: 'https://example.com',
    configVersion: 1,
    requestedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeJob(payload: BuildJobPayload, attemptsMade = 0, attempts = 2): Job<BuildJobPayload> {
  return {
    data: payload,
    name: 'run-build',
    attemptsMade,
    opts: { attempts },
  } as unknown as Job<BuildJobPayload>;
}

function makeDeps() {
  const prisma = {
    build: { update: jest.fn().mockResolvedValue(undefined) },
    buildArtifact: { create: jest.fn().mockResolvedValue(undefined) },
    projectConfig: { findUnique: jest.fn().mockResolvedValue(makeProjectConfig()) },
  };
  const objectStorage = {
    putObject: jest.fn().mockResolvedValue(undefined),
  };
  const redisPublisher = {
    publish: jest.fn().mockResolvedValue(1),
  };
  const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn() } as unknown as Logger;

  return {
    prisma: prisma as never,
    objectStorage: objectStorage as never,
    redisPublisher: redisPublisher as never,
    logger,
    signingKeyEncryptionKey: Buffer.alloc(32),
    mocks: { prisma, objectStorage, redisPublisher },
  };
}

describe('processBuildJob', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('marks the build succeeded and uploads a manifest artifact on a healthy fetch', async () => {
    jest.spyOn(siteFetcher, 'fetchAndValidateSite').mockResolvedValue({
      requestedUrl: 'https://example.com',
      resolvedUrl: 'https://example.com/',
      httpStatus: 200,
      contentType: 'text/html; charset=utf-8',
      contentLengthBytes: 512,
      pageTitle: 'Example Domain',
      fetchDurationMs: 42,
      fetchedAt: new Date().toISOString(),
    });
    // This is a fast, isolated unit test of job orchestration (status transitions,
    // artifact rows, log publishing) — the real Capacitor generation pipeline has
    // its own dedicated integration test in android-project-generator.spec.ts, and
    // the real Gradle/signing pipeline needs a JDK + Android SDK this fast Jest
    // run doesn't have, so it's covered by the full Docker-stack verification.
    jest
      .spyOn(androidGenerator, 'generateAndroidProject')
      .mockImplementation(async (workspace) => {
        const zipPath = join(workspace, 'android-project.zip');
        await writeFile(zipPath, 'fake-zip-contents');
        const apkPath = join(workspace, 'app-release.apk');
        await writeFile(apkPath, 'fake-apk-contents');
        return { projectZipPath: zipPath, buildOutputPath: apkPath };
      });
    jest.spyOn(signingMaterial, 'loadSigningMaterial').mockResolvedValue({
      keyAlias: 'release',
      keystoreBuffer: Buffer.from('fake-keystore'),
      storePassword: 'fake-store-password',
      keyPassword: 'fake-key-password',
    });

    const deps = makeDeps();
    const job = makeJob(makePayload());

    await processBuildJob(job, deps);

    expect(deps.mocks.prisma.build.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'build-1' },
      data: expect.objectContaining({ status: PrismaBuildJobStatus.IN_PROGRESS }),
    });
    expect(deps.mocks.prisma.build.update).toHaveBeenLastCalledWith({
      where: { id: 'build-1' },
      data: expect.objectContaining({
        status: PrismaBuildJobStatus.SUCCEEDED,
        logStorageKey: 'builds/org-1/project-1/build-1/build.log',
      }),
    });
    expect(deps.mocks.prisma.buildArtifact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        buildId: 'build-1',
        storageKey: 'builds/org-1/project-1/build-1/manifest.json',
        contentType: 'application/json',
      }),
    });
    expect(deps.mocks.prisma.buildArtifact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        buildId: 'build-1',
        storageKey: 'builds/org-1/project-1/build-1/android-project.zip',
        contentType: 'application/zip',
      }),
    });
    expect(deps.mocks.prisma.buildArtifact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        buildId: 'build-1',
        storageKey: 'builds/org-1/project-1/build-1/app.apk',
        contentType: 'application/vnd.android.package-archive',
      }),
    });
    expect(deps.mocks.objectStorage.putObject).toHaveBeenCalledTimes(4);

    const statusMessages = deps.mocks.redisPublisher.publish.mock.calls
      .filter(([channel]) => channel === 'build-status:build-1')
      .map(([, message]) => JSON.parse(message as string));
    expect(statusMessages).toEqual([
      { status: BuildJobStatus.IN_PROGRESS },
      { status: BuildJobStatus.SUCCEEDED },
    ]);
  });

  it('marks the build failed and rethrows on the final attempt', async () => {
    jest
      .spyOn(siteFetcher, 'fetchAndValidateSite')
      .mockRejectedValue(new siteFetcher.SiteValidationError('unreachable'));

    const deps = makeDeps();
    const job = makeJob(makePayload(), 1, 2);

    await expect(processBuildJob(job, deps)).rejects.toThrow('unreachable');

    expect(deps.mocks.prisma.build.update).toHaveBeenLastCalledWith({
      where: { id: 'build-1' },
      data: expect.objectContaining({
        status: PrismaBuildJobStatus.FAILED,
        errorMessage: 'unreachable',
      }),
    });
    expect(deps.mocks.prisma.buildArtifact.create).not.toHaveBeenCalled();
  });

  it('rethrows without marking the build failed when a retry attempt remains', async () => {
    jest
      .spyOn(siteFetcher, 'fetchAndValidateSite')
      .mockRejectedValue(new siteFetcher.SiteValidationError('unreachable'));

    const deps = makeDeps();
    const job = makeJob(makePayload(), 0, 2);

    await expect(processBuildJob(job, deps)).rejects.toThrow('unreachable');

    const statuses = deps.mocks.prisma.build.update.mock.calls.map(
      ([call]: [{ data: { status: string } }]) => call.data.status,
    );
    expect(statuses).toEqual([PrismaBuildJobStatus.IN_PROGRESS]);
  });

  it('rejects upload-mode projects without touching the source fetcher', async () => {
    const fetchSpy = jest.spyOn(siteFetcher, 'fetchAndValidateSite');
    const deps = makeDeps();
    const job = makeJob(
      makePayload({ projectSourceType: ProjectSourceType.UPLOAD, projectSourceUrl: null }),
      1,
      1,
    );

    await expect(processBuildJob(job, deps)).rejects.toThrow(/URL-mode projects/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
