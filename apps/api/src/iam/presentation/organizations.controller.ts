import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { Action } from '@ag2/contracts';
import {
  JwtAuthGuard,
  OrgContextGuard,
  PermissionsGuard,
  RequirePermission,
} from '../../common/auth';
import { AuthenticatedRequest } from '../../common/auth/authenticated-request';
import { OrganizationsService } from '../application/organizations.service';
import { UpdateOrganizationDto } from '../application/dto/update-organization.dto';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  listMine(@Req() req: AuthenticatedRequest) {
    return this.organizations.listForUser(req.user.userId);
  }

  @Get(':organizationId')
  @UseGuards(OrgContextGuard, PermissionsGuard)
  @RequirePermission(Action.READ, 'Organization')
  getById(@Param('organizationId') organizationId: string) {
    return this.organizations.getById(organizationId);
  }

  @Patch(':organizationId')
  @UseGuards(OrgContextGuard, PermissionsGuard)
  @RequirePermission(Action.UPDATE, 'Organization')
  update(
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizations.update(organizationId, dto);
  }
}
