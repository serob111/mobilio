import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { QueueModule } from '../queue/queue.module';
import { StorageModule } from '../storage/storage.module';
import { BuildsService } from './application/builds.service';
import { BuildsController } from './presentation/builds.controller';
import { OrgBuildsController } from './presentation/org-builds.controller';
import { BuildsGateway } from './presentation/builds.gateway';

@Module({
  imports: [AuditModule, QueueModule, StorageModule],
  controllers: [BuildsController, OrgBuildsController],
  providers: [BuildsService, BuildsGateway],
})
export class BuildsModule {}
