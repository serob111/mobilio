import { Controller, Get, Inject } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { Redis } from 'ioredis';
import { IObjectStorage } from '@ag2/storage';
import { PrismaService } from '../../common/prisma/prisma.service';
import { REDIS_CLIENT } from '../../common/redis/redis-client.token';
import { OBJECT_STORAGE } from '../../storage/object-storage.token';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicators: HealthIndicatorService,
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(OBJECT_STORAGE) private readonly objectStorage: IObjectStorage,
  ) {}

  @Get('live')
  liveness(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.checkPostgres(),
      () => this.checkRedis(),
      () => this.checkObjectStorage(),
    ]);
  }

  private async checkPostgres() {
    const check = this.indicators.check('postgres');
    try {
      await this.prisma.isHealthy();
      return check.up();
    } catch (error) {
      return check.down((error as Error).message);
    }
  }

  private async checkRedis() {
    const check = this.indicators.check('redis');
    try {
      await this.redis.ping();
      return check.up();
    } catch (error) {
      return check.down((error as Error).message);
    }
  }

  private async checkObjectStorage() {
    const check = this.indicators.check('objectStorage');
    try {
      await this.objectStorage.checkConnectivity();
      return check.up();
    } catch (error) {
      return check.down((error as Error).message);
    }
  }
}
