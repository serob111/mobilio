import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
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
import { SigningKeyService } from '../application/signing-key.service';
import { RegenerateSigningKeyDto } from '../application/dto/regenerate-signing-key.dto';

@Controller('organizations/:organizationId/projects/:projectId/signing')
@UseGuards(JwtAuthGuard, OrgContextGuard, PermissionsGuard)
export class SigningKeyController {
  constructor(private readonly signingKey: SigningKeyService) {}

  @Get()
  @RequirePermission(Action.READ, 'Project')
  get(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.signingKey.getSummary(organizationId, projectId);
  }

  @Post('regenerate')
  @RequirePermission(Action.UPDATE, 'Project')
  regenerate(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Body() dto: RegenerateSigningKeyDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!dto.confirm) {
      throw new BadRequestException(
        'Regenerating the signing key permanently breaks updates for any app already published with the current one — resubmit with confirm: true to proceed',
      );
    }
    return this.signingKey.regenerate(
      organizationId,
      projectId,
      req.user.userId,
      requestContextFrom(req),
    );
  }

  @Get('backup')
  @RequirePermission(Action.DOWNLOAD_ARTIFACT, 'Project')
  @Header('Content-Type', 'application/x-pkcs12')
  async downloadBackup(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const backup = await this.signingKey.getBackup(organizationId, projectId);
    res.set({
      'Content-Disposition': `attachment; filename="${backup.filename}"`,
    });
    return new StreamableFile(backup.body, { type: backup.contentType });
  }
}
