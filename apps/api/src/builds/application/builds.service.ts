import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  BUILD_JOB_NAME,
  BuildArtifactType,
  BuildJobPayload,
  BuildTargetPlatform,
  ProjectSourceType,
  QueueName,
} from '@ag2/contracts';
import { BuildArtifactKind } from '@ag2/database';
import { IObjectStorage } from '@ag2/storage';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditLogService } from '../../audit/application/audit-log.service';
import { OBJECT_STORAGE } from '../../storage/object-storage.token';
import { RequestContext } from '../../iam/application/request-context';
import { TriggerBuildDto } from './dto/trigger-build.dto';
import { toContractsSourceType, toPrismaArtifactType, toPrismaPlatform } from './build-enum.mapper';

const ARTIFACT_URL_TTL_SECONDS = 10 * 60;

@Injectable()
export class BuildsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    @InjectQueue(QueueName.BUILDS) private readonly buildsQueue: Queue<BuildJobPayload>,
    @Inject(OBJECT_STORAGE) private readonly objectStorage: IObjectStorage,
  ) {}

  async trigger(
    organizationId: string,
    projectId: string,
    dto: TriggerBuildDto,
    actorUserId: string,
    context: RequestContext,
  ) {
    const project = await this.prisma.client.project.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (toContractsSourceType(project.sourceType) === ProjectSourceType.UPLOAD) {
      throw new BadRequestException(
        'Upload-mode projects cannot be built yet — that pipeline ships in a later milestone',
      );
    }

    if (dto.platform === BuildTargetPlatform.IOS) {
      throw new BadRequestException('iOS builds are not available yet — that pipeline ships in a later milestone');
    }

    if (
      dto.platform === BuildTargetPlatform.ANDROID &&
      dto.artifactType !== BuildArtifactType.APK &&
      dto.artifactType !== BuildArtifactType.AAB
    ) {
      throw new BadRequestException('Android builds must request an APK or AAB artifact');
    }

    const build = await this.prisma.client.build.create({
      data: {
        projectId,
        organizationId,
        triggeredByUserId: actorUserId,
        platform: toPrismaPlatform(dto.platform),
        artifactType: toPrismaArtifactType(dto.artifactType),
      },
    });

    const payload: BuildJobPayload = {
      buildId: build.id,
      projectId,
      organizationId,
      triggeredByUserId: actorUserId,
      platform: dto.platform,
      artifactType: dto.artifactType,
      projectSourceType: toContractsSourceType(project.sourceType),
      projectSourceUrl: project.sourceUrl,
      configVersion: 1,
      requestedAt: new Date().toISOString(),
    };

    await this.buildsQueue.add(BUILD_JOB_NAME, payload, { jobId: build.id });

    await this.auditLog.record({
      organizationId,
      actorUserId,
      action: 'build.triggered',
      targetType: 'Build',
      targetId: build.id,
      metadata: { projectId, platform: dto.platform, artifactType: dto.artifactType },
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });

    // A freshly triggered build never has artifacts yet, but the field is
    // still included so every endpoint returns the same Build shape —
    // frontend consumers don't need a separate "just-triggered" type.
    return { ...build, artifacts: [] };
  }

  async list(organizationId: string, projectId: string) {
    const builds = await this.prisma.client.build.findMany({
      where: { organizationId, projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        artifacts: {
          select: { id: true, kind: true, contentType: true, sizeBytes: true, createdAt: true },
        },
      },
    });

    return builds.map((build) => ({
      ...build,
      artifacts: build.artifacts.map(serializeArtifact),
    }));
  }

  async getById(organizationId: string, projectId: string, buildId: string) {
    const build = await this.prisma.client.build.findFirst({
      where: { id: buildId, organizationId, projectId },
      include: {
        artifacts: {
          select: { id: true, kind: true, contentType: true, sizeBytes: true, createdAt: true },
        },
      },
    });

    if (!build) {
      throw new NotFoundException('Build not found');
    }

    return {
      ...build,
      artifacts: build.artifacts.map(serializeArtifact),
    };
  }

  async getArtifactDownloadUrl(
    organizationId: string,
    projectId: string,
    buildId: string,
    artifactId: string,
  ): Promise<string> {
    const artifact = await this.prisma.client.buildArtifact.findFirst({
      where: {
        id: artifactId,
        buildId,
        build: { organizationId, projectId },
      },
    });

    if (!artifact) {
      throw new NotFoundException('Artifact not found');
    }

    return this.objectStorage.getSignedDownloadUrl(artifact.storageKey, ARTIFACT_URL_TTL_SECONDS, {
      external: true,
    });
  }

  /**
   * Powers the org-wide Dashboard: real counts (not derived from a capped
   * list, which would misreport totals) plus a small recent-activity feed
   * spanning every project in the org.
   */
  async getOrgOverview(organizationId: string, recentLimit: number) {
    const [totalBuilds, statusGroups, recent] = await Promise.all([
      this.prisma.client.build.count({ where: { organizationId } }),
      this.prisma.client.build.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { _all: true },
      }),
      this.prisma.client.build.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: recentLimit,
        include: {
          project: { select: { id: true, name: true, slug: true } },
          artifacts: {
            select: { id: true, kind: true, contentType: true, sizeBytes: true, createdAt: true },
          },
        },
      }),
    ]);

    const counts = {
      total: totalBuilds,
      queued: 0,
      inProgress: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
    };
    for (const group of statusGroups) {
      const count = group._count._all;
      switch (group.status) {
        case 'QUEUED':
          counts.queued = count;
          break;
        case 'IN_PROGRESS':
          counts.inProgress = count;
          break;
        case 'SUCCEEDED':
          counts.succeeded = count;
          break;
        case 'FAILED':
          counts.failed = count;
          break;
        case 'CANCELLED':
          counts.cancelled = count;
          break;
      }
    }

    return {
      counts,
      recent: recent.map((build) => ({
        ...build,
        artifacts: build.artifacts.map(serializeArtifact),
      })),
    };
  }

  async getLogs(organizationId: string, projectId: string, buildId: string): Promise<string> {
    const build = await this.prisma.client.build.findFirst({
      where: { id: buildId, organizationId, projectId },
    });

    if (!build) {
      throw new NotFoundException('Build not found');
    }

    if (!build.logStorageKey) {
      return '';
    }

    const url = await this.objectStorage.getSignedDownloadUrl(build.logStorageKey, 60);
    const response = await fetch(url);
    return response.text();
  }
}

interface SelectedArtifact {
  id: string;
  kind: BuildArtifactKind;
  contentType: string;
  sizeBytes: bigint;
  createdAt: Date;
}

/** BigInt can't be JSON-serialized as-is (Express/Nest's serializer throws), so `sizeBytes` is stringified before leaving the API. */
function serializeArtifact(artifact: SelectedArtifact) {
  return { ...artifact, sizeBytes: artifact.sizeBytes.toString() };
}
