import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Redis } from 'ioredis';
import { AppEnv } from '@ag2/config';
import { APP_ENV } from '../config';
import { RedisModule } from './redis/redis.module';
import { REDIS_CLIENT } from './redis/redis-client.token';
import { PrismaModule } from './prisma/prisma.module';
import { RedisThrottlerStorageService } from './throttler/redis-throttler-storage.service';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

@Global()
@Module({
  imports: [
    RedisModule,
    PrismaModule,
    ThrottlerModule.forRootAsync({
      inject: [APP_ENV, REDIS_CLIENT],
      useFactory: (env: AppEnv, redis: Redis) => ({
        throttlers: [{ ttl: env.THROTTLE_TTL_SECONDS * 1000, limit: env.THROTTLE_LIMIT }],
        storage: new RedisThrottlerStorageService(redis),
      }),
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class CommonModule {}
