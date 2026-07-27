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
import { ApiKeysService } from '../application/api-keys.service';
import { CreateApiKeyDto } from '../application/dto/create-api-key.dto';

@Controller('organizations/:organizationId/api-keys')
@UseGuards(JwtAuthGuard, OrgContextGuard, PermissionsGuard)
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Get()
  @RequirePermission(Action.READ, 'ApiKey')
  list(@Param('organizationId') organizationId: string) {
    return this.apiKeys.list(organizationId);
  }

  @Post()
  @RequirePermission(Action.CREATE, 'ApiKey')
  create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateApiKeyDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.apiKeys.create(organizationId, dto, req.user.userId, requestContextFrom(req));
  }

  @Delete(':apiKeyId')
  @RequirePermission(Action.DELETE, 'ApiKey')
  revoke(
    @Param('organizationId') organizationId: string,
    @Param('apiKeyId') apiKeyId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.apiKeys.revoke(organizationId, apiKeyId, req.user.userId, requestContextFrom(req));
  }
}
