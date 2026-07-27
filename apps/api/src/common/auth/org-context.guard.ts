import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedRequest } from './authenticated-request';
import { toContractsOrgRole } from './org-role.mapper';

/**
 * Resolves the :organizationId route param against the caller's
 * memberships and attaches the resulting role to the request. Must run
 * after JwtAuthGuard, which populates request.user.
 */
@Injectable()
export class OrgContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const organizationId = request.params['organizationId'];

    if (!organizationId || Array.isArray(organizationId)) {
      throw new ForbiddenException('Missing organization context');
    }

    const membership = await this.prisma.client.membership.findUnique({
      where: { userId_organizationId: { userId: request.user.userId, organizationId } },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this organization');
    }

    request.membership = {
      organizationId,
      role: toContractsOrgRole(membership.role),
      membershipId: membership.id,
    };

    return true;
  }
}
