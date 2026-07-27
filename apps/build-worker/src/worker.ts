import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { Logger } from 'pino';
import { AppEnv } from '@ag2/config';
import { BUILD_JOB_NAME, BuildJobPayload, QueueName } from '@ag2/contracts';
import { createPrismaClient, PrismaClient } from '@ag2/database';
import { parseRedisUrl } from '@ag2/queue';
import { S3ObjectStorage } from '@ag2/storage';
import { processBuildJob } from './processor/build-processor';

export interface BuildWorkerHandles {
  readonly worker: Worker<BuildJobPayload>;
  readonly prisma: PrismaClient;
  readonly redisPublisher: Redis;
  close(): Promise<void>;
}

export function startBuildWorker(env: AppEnv, logger: Logger): BuildWorkerHandles {
  const prisma = createPrismaClient({
    databaseUrl: env.DATABASE_URL,
    logQueries: env.NODE_ENV === 'development',
  });

  // Separate from the Worker's own Redis connection: this one only ever
  // publishes (log lines + status), so it can't be starved by BullMQ's
  // blocking BRPOPLPUSH-style polling on the same connection.
  const redisPublisher = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

  const objectStorage = new S3ObjectStorage({
    bucket: env.S3_BUCKET,
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  });

  const signingKeyEncryptionKey = Buffer.from(env.SIGNING_KEY_ENCRYPTION_KEY, 'base64');

  const worker = new Worker<BuildJobPayload>(
    QueueName.BUILDS,
    async (job) => {
      if (job.name !== BUILD_JOB_NAME) {
        logger.warn({ jobName: job.name }, 'Ignoring unknown job name on builds queue');
        return;
      }
      await processBuildJob(job, {
        prisma,
        objectStorage,
        redisPublisher,
        logger,
        signingKeyEncryptionKey,
      });
    },
    {
      connection: parseRedisUrl(env.REDIS_URL),
      concurrency: env.BUILD_WORKER_CONCURRENCY,
    },
  );

  worker.on('completed', (job) => {
    logger.info({ buildId: job.data.buildId }, 'Build job completed');
  });
  worker.on('failed', (job, err) => {
    logger.error({ buildId: job?.data.buildId, err }, 'Build job failed');
  });

  return {
    worker,
    prisma,
    redisPublisher,
    async close(): Promise<void> {
      await worker.close();
      await redisPublisher.quit();
      await prisma.$disconnect();
    },
  };
}
