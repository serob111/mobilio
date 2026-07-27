import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Action } from '@ag2/contracts';
import {
  JwtAuthGuard,
  OrgContextGuard,
  PermissionsGuard,
  RequirePermission,
} from '../../common/auth';
import { BuildsService } from '../application/builds.service';

@Controller('organizations/:organizationId/builds')
@UseGuards(JwtAuthGuard, OrgContextGuard, PermissionsGuard)
export class OrgBuildsController {
  constructor(private readonly builds: BuildsService) {}

  @Get()
  @RequirePermission(Action.READ, 'Project')
  overview(@Param('organizationId') organizationId: string, @Query('limit') limit = '10') {
    const recentLimit = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 10));
    return this.builds.getOrgOverview(organizationId, recentLimit);
  }
}
