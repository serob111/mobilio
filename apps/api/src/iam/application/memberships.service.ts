import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OrgRole } from '@ag2/contracts';
import { OrgRole as PrismaOrgRole } from '@ag2/database';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditLogService } from '../../audit/application/audit-log.service';
import { toContractsOrgRole, toPrismaOrgRole } from '../../common/auth/org-role.mapper';
import { AddMembershipDto } from './dto/add-membership.dto';
import { UpdateMembershipRoleDto } from './dto/update-membership-role.dto';
import { RequestContext } from './request-context';

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(organizationId: string) {
    const memberships = await this.prisma.client.membership.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((membership) => ({
      id: membership.id,
      role: toContractsOrgRole(membership.role),
      teamId: membership.teamId,
      user: membership.user,
      createdAt: membership.createdAt,
    }));
  }

  async add(
    organizationId: string,
    dto: AddMembershipDto,
    actorUserId: string,
    context: RequestContext,
  ) {
    const user = await this.prisma.client.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new NotFoundException(
        'No registered user found with this email. They must create an ag2 account first.',
      );
    }

    const existing = await this.prisma.client.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId } },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this organization');
    }

    const membership = await this.prisma.client.membership.create({
      data: {
        userId: user.id,
        organizationId,
        role: toPrismaOrgRole(dto.role),
        teamId: dto.teamId,
      },
    });

    await this.auditLog.record({
      organizationId,
      actorUserId,
      action: 'membership.added',
      targetType: 'Membership',
      targetId: membership.id,
      metadata: { email: user.email, role: dto.role },
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });

    return membership;
  }

  async updateRole(
    organizationId: string,
    membershipId: string,
    dto: UpdateMembershipRoleDto,
    actorUserId: string,
    context: RequestContext,
  ) {
    const membership = await this.requireMembership(organizationId, membershipId);

    if (membership.role === PrismaOrgRole.OWNER && dto.role !== OrgRole.OWNER) {
      await this.assertNotLastOwner(organizationId, membershipId);
    }

    const updated = await this.prisma.client.membership.update({
      where: { id: membershipId },
      data: { role: toPrismaOrgRole(dto.role) },
    });

    await this.auditLog.record({
      organizationId,
      actorUserId,
      action: 'membership.role_changed',
      targetType: 'Membership',
      targetId: membershipId,
      metadata: { from: toContractsOrgRole(membership.role), to: dto.role },
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });

    return updated;
  }

  async remove(
    organizationId: string,
    membershipId: string,
    actorUserId: string,
    context: RequestContext,
  ): Promise<void> {
    const membership = await this.requireMembership(organizationId, membershipId);

    if (membership.role === PrismaOrgRole.OWNER) {
      await this.assertNotLastOwner(organizationId, membershipId);
    }

    await this.prisma.client.membership.delete({ where: { id: membershipId } });

    await this.auditLog.record({
      organizationId,
      actorUserId,
      action: 'membership.removed',
      targetType: 'Membership',
      targetId: membershipId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });
  }

  private async requireMembership(organizationId: string, membershipId: string) {
    const membership = await this.prisma.client.membership.findFirst({
      where: { id: membershipId, organizationId },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return membership;
  }

  private async assertNotLastOwner(organizationId: string, excludingMembershipId: string) {
    const otherOwners = await this.prisma.client.membership.count({
      where: {
        organizationId,
        role: PrismaOrgRole.OWNER,
        id: { not: excludingMembershipId },
      },
    });

    if (otherOwners === 0) {
      throw new ConflictException('An organization must have at least one owner');
    }
  }
}
