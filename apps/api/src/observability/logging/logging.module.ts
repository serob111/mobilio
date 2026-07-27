import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { Params } from 'nestjs-pino';
import { AppEnv } from '@ag2/config';
import { APP_ENV } from '../../config';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [APP_ENV],
      useFactory: (env: AppEnv): Params => ({
        pinoHttp: {
          level: env.LOG_LEVEL,
          genReqId: (req) => {
            const existing = req.headers['x-request-id'];
            return typeof existing === 'string' ? existing : randomUUID();
          },
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.passwordConfirmation',
              'res.headers["set-cookie"]',
            ],
            censor: '[REDACTED]',
          },
          transport:
            env.NODE_ENV === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
          autoLogging: {
            ignore: (req) => req.url === '/api/health/live' || req.url === '/api/health/ready',
          },
        },
      }),
    }),
  ],
  exports: [LoggerModule],
})
export class ObservabilityLoggingModule {}
