import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectSourceType, ProjectStatus } from '@ag2/contracts';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditLogService } from '../../audit/application/audit-log.service';
import { slugify } from '../../common/utils/slugify';
import { RequestContext } from '../../iam/application/request-context';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { toPrismaSourceType, toPrismaStatus } from './project-enum.mapper';
import { ProjectConfigService } from './project-config.service';
import { SigningKeyService } from './signing-key.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly projectConfig: ProjectConfigService,
    private readonly signingKey: SigningKeyService,
  ) {}

  list(organizationId: string) {
    return this.prisma.client.project.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(organizationId: string, projectId: string) {
    const project = await this.prisma.client.project.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async create(
    organizationId: string,
    dto: CreateProjectDto,
    actorUserId: string,
    context: RequestContext,
  ) {
    if (dto.sourceType === ProjectSourceType.URL && !dto.sourceUrl) {
      throw new BadRequestException('sourceUrl is required when sourceType is URL');
    }

    const organization = await this.prisma.client.organization.findUnique({
      where: { id: organizationId },
      select: { slug: true },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const slug = await this.uniqueProjectSlug(organizationId, dto.name);

    const project = await this.prisma.client.project.create({
      data: {
        organizationId,
        createdByUserId: actorUserId,
        name: dto.name,
        slug,
        sourceType: toPrismaSourceType(dto.sourceType),
        sourceUrl: dto.sourceType === ProjectSourceType.URL ? dto.sourceUrl : undefined,
        status: toPrismaStatus(
          dto.sourceType === ProjectSourceType.URL ? ProjectStatus.ACTIVE : ProjectStatus.DRAFT,
        ),
      },
    });

    await this.projectConfig.createDefault(project, organization.slug);
    await this.signingKey.createDefault(project);

    await this.auditLog.record({
      organizationId,
      actorUserId,
      action: 'project.created',
      targetType: 'Project',
      targetId: project.id,
      metadata: { name: project.name, sourceType: project.sourceType },
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });

    return project;
  }

  async update(
    organizationId: string,
    projectId: string,
    dto: UpdateProjectDto,
    actorUserId: string,
    context: RequestContext,
  ) {
    await this.getById(organizationId, projectId);

    const project = await this.prisma.client.project.update({
      where: { id: projectId },
      data: { name: dto.name, sourceUrl: dto.sourceUrl },
    });

    await this.auditLog.record({
      organizationId,
      actorUserId,
      action: 'project.updated',
      targetType: 'Project',
      targetId: project.id,
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });

    return project;
  }

  async archive(
    organizationId: string,
    projectId: string,
    actorUserId: string,
    context: RequestContext,
  ) {
    await this.getById(organizationId, projectId);

    const project = await this.prisma.client.project.update({
      where: { id: projectId },
      data: { status: toPrismaStatus(ProjectStatus.ARCHIVED) },
    });

    await this.auditLog.record({
      organizationId,
      actorUserId,
      action: 'project.archived',
      targetType: 'Project',
      targetId: project.id,
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });

    return project;
  }

  private async uniqueProjectSlug(organizationId: string, name: string): Promise<string> {
    const base = slugify(name) || 'project';
    let candidate = base;
    let suffix = 2;

    while (
      await this.prisma.client.project.findUnique({
        where: { organizationId_slug: { organizationId, slug: candidate } },
      })
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
