import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Action } from '@ag2/contracts';
import {
  JwtAuthGuard,
  OrgContextGuard,
  PermissionsGuard,
  RequirePermission,
} from '../../common/auth';
import { AuthenticatedRequest } from '../../common/auth/authenticated-request';
import { requestContextFrom } from '../../common/utils/request-context.util';
import { TeamsService } from '../application/teams.service';
import { CreateTeamDto } from '../application/dto/create-team.dto';

@Controller('organizations/:organizationId/teams')
@UseGuards(JwtAuthGuard, OrgContextGuard, PermissionsGuard)
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  @RequirePermission(Action.READ, 'Team')
  list(@Param('organizationId') organizationId: string) {
    return this.teams.list(organizationId);
  }

  @Post()
  @RequirePermission(Action.CREATE, 'Team')
  create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateTeamDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.teams.create(organizationId, dto, req.user.userId, requestContextFrom(req));
  }

  @Delete(':teamId')
  @RequirePermission(Action.DELETE, 'Team')
  remove(
    @Param('organizationId') organizationId: string,
    @Param('teamId') teamId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.teams.remove(organizationId, teamId, req.user.userId, requestContextFrom(req));
  }
}
