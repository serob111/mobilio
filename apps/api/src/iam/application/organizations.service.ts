import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toContractsOrgRole } from '../../common/auth/org-role.mapper';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    const memberships = await this.prisma.client.membership.findMany({
      where: { userId },
      include: { organization: true },
    });

    return memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      plan: membership.organization.plan,
      role: toContractsOrgRole(membership.role),
      createdAt: membership.organization.createdAt,
    }));
  }

  async getById(organizationId: string) {
    const organization = await this.prisma.client.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async update(organizationId: string, dto: UpdateOrganizationDto) {
    await this.getById(organizationId);

    return this.prisma.client.organization.update({
      where: { id: organizationId },
      data: { name: dto.name },
    });
  }
}
