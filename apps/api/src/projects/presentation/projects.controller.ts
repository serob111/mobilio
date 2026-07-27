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
import { ProjectsService } from '../application/projects.service';
import { CreateProjectDto } from '../application/dto/create-project.dto';
import { UpdateProjectDto } from '../application/dto/update-project.dto';

@Controller('organizations/:organizationId/projects')
@UseGuards(JwtAuthGuard, OrgContextGuard, PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @RequirePermission(Action.READ, 'Project')
  list(@Param('organizationId') organizationId: string) {
    return this.projects.list(organizationId);
  }

  @Get(':projectId')
  @RequirePermission(Action.READ, 'Project')
  getById(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projects.getById(organizationId, projectId);
  }

  @Post()
  @RequirePermission(Action.CREATE, 'Project')
  create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateProjectDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.projects.create(organizationId, dto, req.user.userId, requestContextFrom(req));
  }

  @Patch(':projectId')
  @RequirePermission(Action.UPDATE, 'Project')
  update(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.projects.update(
      organizationId,
      projectId,
      dto,
      req.user.userId,
      requestContextFrom(req),
    );
  }

  @Delete(':projectId')
  @RequirePermission(Action.DELETE, 'Project')
  archive(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.projects.archive(organizationId, projectId, req.user.userId, requestContextFrom(req));
  }
}
