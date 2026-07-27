import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueName } from '@ag2/contracts';
import { AppEnv } from '@ag2/config';
import { BUILD_QUEUE_DEFAULT_JOB_OPTIONS, parseRedisUrl } from '@ag2/queue';
import { APP_ENV } from '../config';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [APP_ENV],
      useFactory: (env: AppEnv) => ({
        connection: parseRedisUrl(env.REDIS_URL),
      }),
    }),
    BullModule.registerQueue(
      {
        name: QueueName.EMAILS,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: { age: 60 * 60 * 24 },
          removeOnFail: { age: 60 * 60 * 24 * 7 },
        },
      },
      {
        name: QueueName.BUILDS,
        defaultJobOptions: BUILD_QUEUE_DEFAULT_JOB_OPTIONS,
      },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
