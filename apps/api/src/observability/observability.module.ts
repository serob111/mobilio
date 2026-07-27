import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ObservabilityLoggingModule } from './logging/logging.module';
import { MetricsModule } from './metrics/metrics.module';
import { HealthController } from './health/health.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [ObservabilityLoggingModule, MetricsModule, TerminusModule, StorageModule],
  controllers: [HealthController],
})
export class ObservabilityModule {}
