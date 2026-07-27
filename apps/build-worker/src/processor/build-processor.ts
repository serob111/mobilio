import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Job } from 'bullmq';
import { Redis } from 'ioredis';
import { Logger } from 'pino';
import {
  BuildArtifactKind,
  BuildArtifactType,
  BuildJobPayload,
  BuildJobStatus,
  BuildTargetPlatform,
  ProjectSourceType,
} from '@ag2/contracts';
import { PrismaClient } from '@ag2/database';
import { IObjectStorage } from '@ag2/storage';
import { toPrismaArtifactKind, toPrismaJobStatus } from '../build-enum.mapper';
import { toContractsOrientation, toContractsPermission, toContractsStatusBarStyle } from '../project-config.enum.mapper';
import { generateAndroidProject } from '../capacitor/android-project-generator';
import { GradleArtifactType } from '../capacitor/android-gradle-build';
import { loadSigningMaterial } from '../signing/load-signing-material';
import { BuildLogPublisher } from '../logging/build-log-publisher';
import { buildManifest } from '../manifest/build-manifest';
import { fetchAndValidateSite, SiteValidationError } from '../site/site-fetcher';
import { createBuildWorkspace, destroyBuildWorkspace } from '../workspace/build-workspace';

export interface BuildProcessorDeps {
  readonly prisma: PrismaClient;
  readonly objectStorage: IObjectStorage;
  readonly redisPublisher: Redis;
  readonly logger: Logger;
  readonly signingKeyEncryptionKey: Buffer;
}

const ERROR_MESSAGE_MAX_LENGTH = 2000;

export async function processBuildJob(
  job: Job<BuildJobPayload>,
  deps: BuildProcessorDeps,
): Promise<void> {
  const payload = job.data;
  const publisher = new BuildLogPublisher(deps.redisPublisher, payload.buildId);
  const workspace = await createBuildWorkspace(payload.buildId);
  const artifactPrefix = `builds/${payload.organizationId}/${payload.projectId}/${payload.buildId}`;
  const maxAttempts = job.opts.attempts ?? 1;
  const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

  try {
    await deps.prisma.build.update({
      where: { id: payload.buildId },
      data: { status: toPrismaJobStatus(BuildJobStatus.IN_PROGRESS), startedAt: new Date() },
    });
    await publisher.status(BuildJobStatus.IN_PROGRESS);
    await publisher.log(
      `Build ${payload.buildId} started for project ${payload.projectId} (attempt ${job.attemptsMade + 1}/${maxAttempts})`,
    );

    if (payload.projectSourceType !== ProjectSourceType.URL || !payload.projectSourceUrl) {
      throw new Error(
        'Only URL-mode projects can be built in this milestone — upload-mode ships in a later release',
      );
    }
    const sourceUrl = payload.projectSourceUrl;

    await publisher.log(`Fetching and validating source URL: ${sourceUrl}`);
    const siteResult = await fetchAndValidateSite(sourceUrl);
    await publisher.log(
      `Source responded ${siteResult.httpStatus} (${siteResult.contentType}), title="${
        siteResult.pageTitle ?? 'n/a'
      }" in ${siteResult.fetchDurationMs}ms`,
    );

    const manifest = buildManifest(payload, sourceUrl, siteResult);
    const manifestJson = JSON.stringify(manifest, null, 2);
    await writeFile(join(workspace, 'manifest.json'), manifestJson, 'utf-8');
    await publisher.log('Generated build manifest');

    const manifestKey = `${artifactPrefix}/manifest.json`;
    await deps.objectStorage.putObject({
      key: manifestKey,
      body: Buffer.from(manifestJson, 'utf-8'),
      contentType: 'application/json',
      contentLength: Buffer.byteLength(manifestJson),
    });
    await publisher.log(`Uploaded manifest artifact to ${manifestKey}`);

    await deps.prisma.buildArtifact.create({
      data: {
        buildId: payload.buildId,
        kind: toPrismaArtifactKind(BuildArtifactKind.MANIFEST),
        storageKey: manifestKey,
        contentType: 'application/json',
        sizeBytes: BigInt(Buffer.byteLength(manifestJson)),
      },
    });

    if (payload.platform === BuildTargetPlatform.ANDROID) {
      await generateAndroidArtifact(deps, payload, workspace, sourceUrl, artifactPrefix, publisher);
    } else {
      throw new Error('iOS builds are not available yet — that pipeline ships in a later milestone');
    }

    await publisher.log('Build completed successfully');
    await uploadLog(deps, artifactPrefix, publisher);

    await deps.prisma.build.update({
      where: { id: payload.buildId },
      data: {
        status: toPrismaJobStatus(BuildJobStatus.SUCCEEDED),
        completedAt: new Date(),
        logStorageKey: `${artifactPrefix}/build.log`,
      },
    });
    await publisher.status(BuildJobStatus.SUCCEEDED);
  } catch (error) {
    const reason =
      error instanceof SiteValidationError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Unknown build error';

    await publisher.log(`Build failed: ${reason}`).catch(() => undefined);

    if (!isFinalAttempt) {
      await publisher
        .log(`Attempt ${job.attemptsMade + 1}/${maxAttempts} failed, will retry`)
        .catch(() => undefined);
      throw error;
    }

    await uploadLog(deps, artifactPrefix, publisher).catch((uploadError: unknown) =>
      deps.logger.error({ err: uploadError, buildId: payload.buildId }, 'Failed to upload failure log'),
    );

    await deps.prisma.build.update({
      where: { id: payload.buildId },
      data: {
        status: toPrismaJobStatus(BuildJobStatus.FAILED),
        completedAt: new Date(),
        errorMessage: reason.slice(0, ERROR_MESSAGE_MAX_LENGTH),
        logStorageKey: `${artifactPrefix}/build.log`,
      },
    });
    await publisher.status(BuildJobStatus.FAILED, reason);

    throw error;
  } finally {
    await destroyBuildWorkspace(workspace);
  }
}

async function generateAndroidArtifact(
  deps: BuildProcessorDeps,
  payload: BuildJobPayload,
  workspace: string,
  sourceUrl: string,
  artifactPrefix: string,
  publisher: BuildLogPublisher,
): Promise<void> {
  const config = await deps.prisma.projectConfig.findUnique({
    where: { projectId: payload.projectId },
  });
  if (!config) {
    throw new Error(`Project ${payload.projectId} has no config — cannot generate an Android project`);
  }

  const gradleArtifactType: GradleArtifactType =
    payload.artifactType === BuildArtifactType.AAB ? 'AAB' : 'APK';

  const [iconBuffer, splashBuffer, signing] = await Promise.all([
    config.iconStorageKey ? downloadAsset(deps.objectStorage, config.iconStorageKey) : null,
    config.splashStorageKey ? downloadAsset(deps.objectStorage, config.splashStorageKey) : null,
    loadSigningMaterial(deps.prisma, deps.objectStorage, deps.signingKeyEncryptionKey, payload.projectId),
  ]);
  await publisher.log('Loaded release signing key');

  await publisher.log('Generating Capacitor Android project…');
  const { projectZipPath, buildOutputPath } = await generateAndroidProject(
    workspace,
    {
      appId: config.packageName,
      appName: config.appName ?? 'App',
      versionName: config.versionName,
      versionCode: config.versionCode,
      sourceUrl,
      themeColor: config.themeColor,
      orientation: toContractsOrientation(config.orientation),
      statusBarStyle: toContractsStatusBarStyle(config.statusBarStyle),
      allowedNavigationDomains: config.allowedNavigationDomains,
      deepLinkScheme: config.deepLinkScheme,
      customUserAgent: config.customUserAgent,
      permissions: config.permissions.map(toContractsPermission),
      iconBuffer,
      splashBuffer,
    },
    (line) => publisher.log(line),
    {
      artifactType: gradleArtifactType,
      signing: {
        keystoreBuffer: signing.keystoreBuffer,
        storePassword: signing.storePassword,
        keyPassword: signing.keyPassword,
        keyAlias: signing.keyAlias,
      },
    },
  );

  const zipBuffer = await readFile(projectZipPath);
  const projectArtifactKey = `${artifactPrefix}/android-project.zip`;
  await deps.objectStorage.putObject({
    key: projectArtifactKey,
    body: zipBuffer,
    contentType: 'application/zip',
    contentLength: zipBuffer.byteLength,
  });
  await publisher.log(`Uploaded Android project artifact to ${projectArtifactKey}`);

  await deps.prisma.buildArtifact.create({
    data: {
      buildId: payload.buildId,
      kind: toPrismaArtifactKind(BuildArtifactKind.ANDROID_PROJECT),
      storageKey: projectArtifactKey,
      contentType: 'application/zip',
      sizeBytes: BigInt(zipBuffer.byteLength),
    },
  });

  if (!buildOutputPath) {
    // Unreachable: `build` was always passed above, so
    // generateAndroidProject() always sets this — guards against a future
    // refactor silently making the release build optional again.
    throw new Error('Gradle did not produce a build output');
  }

  const isAab = gradleArtifactType === 'AAB';
  const buildOutputBuffer = await readFile(buildOutputPath);
  const buildArtifactKey = `${artifactPrefix}/app.${isAab ? 'aab' : 'apk'}`;
  const buildContentType = isAab
    ? 'application/octet-stream'
    : 'application/vnd.android.package-archive';

  await deps.objectStorage.putObject({
    key: buildArtifactKey,
    body: buildOutputBuffer,
    contentType: buildContentType,
    contentLength: buildOutputBuffer.byteLength,
  });
  await publisher.log(`Uploaded signed ${isAab ? 'AAB' : 'APK'} artifact to ${buildArtifactKey}`);

  await deps.prisma.buildArtifact.create({
    data: {
      buildId: payload.buildId,
      kind: toPrismaArtifactKind(isAab ? BuildArtifactKind.AAB : BuildArtifactKind.APK),
      storageKey: buildArtifactKey,
      contentType: buildContentType,
      sizeBytes: BigInt(buildOutputBuffer.byteLength),
    },
  });
}

async function downloadAsset(objectStorage: IObjectStorage, storageKey: string): Promise<Buffer> {
  const url = await objectStorage.getSignedDownloadUrl(storageKey, 60);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download asset ${storageKey}: HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function uploadLog(
  deps: BuildProcessorDeps,
  artifactPrefix: string,
  publisher: BuildLogPublisher,
): Promise<void> {
  const logText = publisher.fullLog;
  await deps.objectStorage.putObject({
    key: `${artifactPrefix}/build.log`,
    body: Buffer.from(logText, 'utf-8'),
    contentType: 'text/plain; charset=utf-8',
    contentLength: Buffer.byteLength(logText),
  });
}
