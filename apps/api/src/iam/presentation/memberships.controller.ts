import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Action } from '@ag2/contracts';
import {
  JwtAuthGuard,
  OrgContextGuard,
  PermissionsGuard,
  RequirePermission,
} from '../../common/auth';
import { AuthenticatedRequest } from '../../common/auth/authenticated-request';
import { requestContextFrom } from '../../common/utils/request-context.util';
import { MembershipsService } from '../application/memberships.service';
import { AddMembershipDto } from '../application/dto/add-membership.dto';
import { UpdateMembershipRoleDto } from '../application/dto/update-membership-role.dto';

@Controller('organizations/:organizationId/memberships')
@UseGuards(JwtAuthGuard, OrgContextGuard, PermissionsGuard)
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Get()
  @RequirePermission(Action.READ, 'Membership')
  list(@Param('organizationId') organizationId: string) {
    return this.memberships.list(organizationId);
  }

  @Post()
  @RequirePermission(Action.INVITE, 'Membership')
  add(
    @Param('organizationId') organizationId: string,
    @Body() dto: AddMembershipDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.memberships.add(organizationId, dto, req.user.userId, requestContextFrom(req));
  }

  @Patch(':membershipId')
  @RequirePermission(Action.UPDATE, 'Membership')
  updateRole(
    @Param('organizationId') organizationId: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateMembershipRoleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.memberships.updateRole(
      organizationId,
      membershipId,
      dto,
      req.user.userId,
      requestContextFrom(req),
    );
  }

  @Delete(':membershipId')
  @RequirePermission(Action.REMOVE_MEMBER, 'Membership')
  remove(
    @Param('organizationId') organizationId: string,
    @Param('membershipId') membershipId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.memberships.remove(
      organizationId,
      membershipId,
      req.user.userId,
      requestContextFrom(req),
    );
  }
}
