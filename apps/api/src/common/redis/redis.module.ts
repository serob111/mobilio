import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
import { AppEnv } from '@ag2/config';
import { APP_ENV } from '../../config';
import { REDIS_CLIENT } from './redis-client.token';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (env: AppEnv): Redis =>
        new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }),
      inject: [APP_ENV],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.client.quit();
  }
}
