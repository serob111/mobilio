import './otel-init';

import pino from 'pino';
import { loadEnv } from '@ag2/config';
import { initSentry } from '@ag2/observability';
import { startBuildWorker } from './worker';

const env = loadEnv(process.env);
initSentry(env, 'ag2-build-worker');

const logger = pino({ level: env.LOG_LEVEL, name: 'ag2-build-worker' });

const handles = startBuildWorker(env, logger);
logger.info(
  { concurrency: env.BUILD_WORKER_CONCURRENCY },
  'ag2 build-worker started, listening for build jobs',
);

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  logger.info({ signal }, 'Shutting down build-worker');
  try {
    await handles.close();
    logger.info('build-worker shut down cleanly');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error during build-worker shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
