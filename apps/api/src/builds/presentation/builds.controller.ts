import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Action } from '@ag2/contracts';
import {
  JwtAuthGuard,
  OrgContextGuard,
  PermissionsGuard,
  RequirePermission,
} from '../../common/auth';
import { AuthenticatedRequest } from '../../common/auth/authenticated-request';
import { requestContextFrom } from '../../common/utils/request-context.util';
import { BuildsService } from '../application/builds.service';
import { TriggerBuildDto } from '../application/dto/trigger-build.dto';

@Controller('organizations/:organizationId/projects/:projectId/builds')
@UseGuards(JwtAuthGuard, OrgContextGuard, PermissionsGuard)
export class BuildsController {
  constructor(private readonly builds: BuildsService) {}

  @Post()
  @RequirePermission(Action.TRIGGER_BUILD, 'Project')
  trigger(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Body() dto: TriggerBuildDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.builds.trigger(organizationId, projectId, dto, req.user.userId, requestContextFrom(req));
  }

  @Get()
  @RequirePermission(Action.READ, 'Project')
  list(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.builds.list(organizationId, projectId);
  }

  @Get(':buildId')
  @RequirePermission(Action.READ, 'Project')
  getById(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Param('buildId') buildId: string,
  ) {
    return this.builds.getById(organizationId, projectId, buildId);
  }

  @Get(':buildId/artifacts/:artifactId/download')
  @RequirePermission(Action.DOWNLOAD_ARTIFACT, 'Project')
  async getArtifactDownloadUrl(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Param('buildId') buildId: string,
    @Param('artifactId') artifactId: string,
  ) {
    const downloadUrl = await this.builds.getArtifactDownloadUrl(
      organizationId,
      projectId,
      buildId,
      artifactId,
    );
    return { downloadUrl };
  }

  @Get(':buildId/logs')
  @RequirePermission(Action.READ, 'Project')
  async getLogs(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Param('buildId') buildId: string,
    @Res() res: Response,
  ) {
    const logs = await this.builds.getLogs(organizationId, projectId, buildId);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(logs);
  }
}
