import { Module } from '@nestjs/common';
import { AppConfigModule } from './config';
import { CommonModule } from './common/common.module';
import { AuthFoundationModule } from './common/auth';
import { ObservabilityModule } from './observability/observability.module';
import { StorageModule } from './storage/storage.module';
import { QueueModule } from './queue/queue.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { IamModule } from './iam/iam.module';
import { ProjectsModule } from './projects/projects.module';
import { BuildsModule } from './builds/builds.module';

@Module({
  imports: [
    AppConfigModule,
    CommonModule,
    AuthFoundationModule,
    ObservabilityModule,
    StorageModule,
    QueueModule,
    NotificationsModule,
    AuditModule,
    IamModule,
    ProjectsModule,
    BuildsModule,
  ],
})
export class AppModule {}
