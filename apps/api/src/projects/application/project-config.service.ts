import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IObjectStorage } from '@ag2/storage';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditLogService } from '../../audit/application/audit-log.service';
import { OBJECT_STORAGE } from '../../storage/object-storage.token';
import { RequestContext } from '../../iam/application/request-context';
import { UpdateProjectConfigDto } from './dto/update-project-config.dto';
import {
  toPrismaOrientation,
  toPrismaPermission,
  toPrismaStatusBarStyle,
} from './project-config.enum.mapper';

const ASSET_URL_TTL_SECONDS = 10 * 60;
const MAX_ASSET_SIZE_BYTES = 5 * 1024 * 1024;

type AssetKind = 'icon' | 'splash';

@Injectable()
export class ProjectConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    @Inject(OBJECT_STORAGE) private readonly objectStorage: IObjectStorage,
  ) {}

  /** Called once, right after a project is created — every project always has a config row from that point on. */
  async createDefault(project: { id: string; organizationId: string; slug: string }, organizationSlug: string) {
    return this.prisma.client.projectConfig.create({
      data: {
        projectId: project.id,
        packageName: derivePackageName(organizationSlug, project.slug),
      },
    });
  }

  async getByProject(organizationId: string, projectId: string) {
    await this.assertProjectExists(organizationId, projectId);

    const config = await this.prisma.client.projectConfig.findUnique({ where: { projectId } });
    if (!config) {
      // Defensive only — createDefault() runs synchronously with project
      // creation, so every project should already have one of these.
      throw new NotFoundException('Project config not found');
    }

    return config;
  }

  async update(
    organizationId: string,
    projectId: string,
    dto: UpdateProjectConfigDto,
    actorUserId: string,
    context: RequestContext,
  ) {
    await this.assertProjectExists(organizationId, projectId);

    const config = await this.prisma.client.projectConfig.update({
      where: { projectId },
      data: {
        appName: dto.appName,
        packageName: dto.packageName,
        versionName: dto.versionName,
        versionCode: dto.versionCode,
        themeColor: dto.themeColor,
        orientation: dto.orientation ? toPrismaOrientation(dto.orientation) : undefined,
        statusBarStyle: dto.statusBarStyle ? toPrismaStatusBarStyle(dto.statusBarStyle) : undefined,
        allowedNavigationDomains: dto.allowedNavigationDomains,
        deepLinkScheme: dto.deepLinkScheme,
        customUserAgent: dto.customUserAgent,
        permissions: dto.permissions?.map(toPrismaPermission),
      },
    });

    await this.auditLog.record({
      organizationId,
      actorUserId,
      action: 'project.config_updated',
      targetType: 'Project',
      targetId: projectId,
      metadata: { fields: Object.keys(dto) },
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });

    return config;
  }

  async getAssetUploadUrl(
    organizationId: string,
    projectId: string,
    kind: AssetKind,
    contentType: string,
  ): Promise<{ uploadUrl: string; storageKey: string }> {
    await this.assertProjectExists(organizationId, projectId);

    const storageKey = this.assetStorageKey(organizationId, projectId, kind);
    const uploadUrl = await this.objectStorage.getSignedUploadUrl(
      storageKey,
      contentType,
      ASSET_URL_TTL_SECONDS,
      { external: true },
    );

    return { uploadUrl, storageKey };
  }

  async confirmAssetUpload(organizationId: string, projectId: string, kind: AssetKind) {
    await this.assertProjectExists(organizationId, projectId);

    const storageKey = this.assetStorageKey(organizationId, projectId, kind);
    const head = await this.objectStorage.headObject(storageKey);

    if (!head) {
      throw new BadRequestException('Upload not found — request a new upload URL and try again');
    }
    if (head.contentLength > MAX_ASSET_SIZE_BYTES) {
      await this.objectStorage.deleteObject(storageKey);
      throw new BadRequestException(`Asset exceeds the ${MAX_ASSET_SIZE_BYTES / (1024 * 1024)}MB limit`);
    }
    if (!head.contentType.startsWith('image/')) {
      await this.objectStorage.deleteObject(storageKey);
      throw new BadRequestException('Uploaded asset must be an image');
    }

    const field = kind === 'icon' ? 'iconStorageKey' : 'splashStorageKey';
    return this.prisma.client.projectConfig.update({
      where: { projectId },
      data: { [field]: storageKey },
    });
  }

  async getAssetDownloadUrl(
    organizationId: string,
    projectId: string,
    kind: AssetKind,
  ): Promise<string | null> {
    const config = await this.getByProject(organizationId, projectId);
    const storageKey = kind === 'icon' ? config.iconStorageKey : config.splashStorageKey;
    if (!storageKey) {
      return null;
    }

    return this.objectStorage.getSignedDownloadUrl(storageKey, ASSET_URL_TTL_SECONDS, {
      external: true,
    });
  }

  private assetStorageKey(organizationId: string, projectId: string, kind: AssetKind): string {
    return `projects/${organizationId}/${projectId}/${kind}.png`;
  }

  private async assertProjectExists(organizationId: string, projectId: string): Promise<void> {
    const project = await this.prisma.client.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }
}

function sanitizePackageSegment(slug: string): string {
  let segment = slug.replace(/-/g, '_').replace(/[^a-z0-9_]/g, '');
  if (!segment) {
    segment = 'app';
  }
  if (/^[0-9]/.test(segment)) {
    segment = `a${segment}`;
  }
  return segment;
}

function derivePackageName(organizationSlug: string, projectSlug: string): string {
  return `com.ag2apps.${sanitizePackageSegment(organizationSlug)}.${sanitizePackageSegment(projectSlug)}`;
}
