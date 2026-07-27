import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createPrismaClient, PrismaClient } from '@ag2/database';
import { AppEnv } from '@ag2/config';
import { APP_ENV } from '../../config';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  readonly client: PrismaClient;

  constructor(@Inject(APP_ENV) env: AppEnv) {
    this.client = createPrismaClient({
      databaseUrl: env.DATABASE_URL,
      logQueries: env.NODE_ENV === 'development',
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
    this.logger.log('Connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }

  async isHealthy(): Promise<boolean> {
    await this.client.$queryRaw`SELECT 1`;
    return true;
  }
}
