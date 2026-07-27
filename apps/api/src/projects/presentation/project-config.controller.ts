import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Action } from '@ag2/contracts';
import {
  JwtAuthGuard,
  OrgContextGuard,
  PermissionsGuard,
  RequirePermission,
} from '../../common/auth';
import { AuthenticatedRequest } from '../../common/auth/authenticated-request';
import { requestContextFrom } from '../../common/utils/request-context.util';
import { ProjectConfigService } from '../application/project-config.service';
import { UpdateProjectConfigDto } from '../application/dto/update-project-config.dto';
import { RequestAssetUploadDto } from '../application/dto/request-asset-upload.dto';

type AssetKind = 'icon' | 'splash';

function parseAssetKind(value: string): AssetKind {
  if (value !== 'icon' && value !== 'splash') {
    throw new BadRequestException('Asset kind must be "icon" or "splash"');
  }
  return value;
}

@Controller('organizations/:organizationId/projects/:projectId/config')
@UseGuards(JwtAuthGuard, OrgContextGuard, PermissionsGuard)
export class ProjectConfigController {
  constructor(private readonly config: ProjectConfigService) {}

  @Get()
  @RequirePermission(Action.READ, 'Project')
  get(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.config.getByProject(organizationId, projectId);
  }

  @Patch()
  @RequirePermission(Action.UPDATE, 'Project')
  update(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectConfigDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.config.update(
      organizationId,
      projectId,
      dto,
      req.user.userId,
      requestContextFrom(req),
    );
  }

  @Post(':kind/upload-url')
  @RequirePermission(Action.UPDATE, 'Project')
  getAssetUploadUrl(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Param('kind') kind: string,
    @Body() dto: RequestAssetUploadDto,
  ) {
    return this.config.getAssetUploadUrl(
      organizationId,
      projectId,
      parseAssetKind(kind),
      dto.contentType,
    );
  }

  @Post(':kind/confirm')
  @RequirePermission(Action.UPDATE, 'Project')
  confirmAssetUpload(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Param('kind') kind: string,
  ) {
    return this.config.confirmAssetUpload(organizationId, projectId, parseAssetKind(kind));
  }

  @Get(':kind/download-url')
  @RequirePermission(Action.READ, 'Project')
  async getAssetDownloadUrl(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Param('kind') kind: string,
  ) {
    const downloadUrl = await this.config.getAssetDownloadUrl(
      organizationId,
      projectId,
      parseAssetKind(kind),
    );
    return { downloadUrl };
  }
}
