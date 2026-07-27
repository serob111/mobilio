import { JobsOptions } from 'bullmq';

/**
 * Shared between the API (producer, via `BullModule.registerQueue`) and the
 * build-worker (consumer) so retry/retention policy can't drift between the
 * two processes. Builds are expensive (real network + filesystem work), so
 * retries are capped low and failed jobs are kept around far longer than
 * completed ones — a failure is worth investigating, a success isn't.
 */
export const BUILD_QUEUE_DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 2,
  backoff: { type: 'exponential', delay: 30_000 },
  removeOnComplete: { age: 60 * 60 * 24 * 7 },
  removeOnFail: { age: 60 * 60 * 24 * 30 },
};
