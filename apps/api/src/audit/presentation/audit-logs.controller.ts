import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Action } from '@ag2/contracts';
import {
  JwtAuthGuard,
  OrgContextGuard,
  PermissionsGuard,
  RequirePermission,
} from '../../common/auth';
import { AuditLogService } from '../application/audit-log.service';

@Controller('organizations/:organizationId/audit-logs')
@UseGuards(JwtAuthGuard, OrgContextGuard, PermissionsGuard)
export class AuditLogsController {
  constructor(private readonly auditLogs: AuditLogService) {}

  @Get()
  @RequirePermission(Action.READ, 'AuditLog')
  list(
    @Param('organizationId') organizationId: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '25',
  ) {
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const size = Math.min(100, Math.max(1, Number.parseInt(pageSize, 10) || 25));
    return this.auditLogs.list(organizationId, pageNumber, size);
  }
}
