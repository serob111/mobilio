import { loadEnv } from '@ag2/config';
import { startTracing } from '@ag2/observability';

startTracing(loadEnv(process.env), 'ag2-build-worker');
