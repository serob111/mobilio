import * as Sentry from '@sentry/node';
import { AppEnv } from '@ag2/config';

export function initSentry(env: AppEnv, serviceName = env.OTEL_SERVICE_NAME): void {
  if (!env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    serverName: serviceName,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}
