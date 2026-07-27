import { Module } from '@nestjs/common';
import { AuditLogService } from './application/audit-log.service';
import { AuditLogsController } from './presentation/audit-logs.controller';

@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditModule {}
