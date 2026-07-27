import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditLogService } from '../../audit/application/audit-log.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { RequestContext } from './request-context';

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  list(organizationId: string) {
    return this.prisma.client.team.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    organizationId: string,
    dto: CreateTeamDto,
    actorUserId: string,
    context: RequestContext,
  ) {
    const existing = await this.prisma.client.team.findUnique({
      where: { organizationId_name: { organizationId, name: dto.name } },
    });

    if (existing) {
      throw new ConflictException('A team with this name already exists');
    }

    const team = await this.prisma.client.team.create({
      data: { organizationId, name: dto.name },
    });

    await this.auditLog.record({
      organizationId,
      actorUserId,
      action: 'team.created',
      targetType: 'Team',
      targetId: team.id,
      metadata: { name: team.name },
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });

    return team;
  }

  async remove(
    organizationId: string,
    teamId: string,
    actorUserId: string,
    context: RequestContext,
  ): Promise<void> {
    const team = await this.prisma.client.team.findFirst({
      where: { id: teamId, organizationId },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    await this.prisma.client.team.delete({ where: { id: teamId } });

    await this.auditLog.record({
      organizationId,
      actorUserId,
      action: 'team.deleted',
      targetType: 'Team',
      targetId: teamId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });
  }
}
