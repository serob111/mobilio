import { Global, Module } from '@nestjs/common';
import { getToken, makeCounterProvider, PrometheusModule } from '@willsoto/nestjs-prometheus';
import { EMAILS_FAILED_TOTAL, EMAILS_SENT_TOTAL, USERS_REGISTERED_TOTAL } from './metric-names';

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      global: true,
      path: '/metrics',
      defaultMetrics: { enabled: true },
      defaultLabels: { service: 'ag2-api' },
    }),
  ],
  providers: [
    makeCounterProvider({ name: USERS_REGISTERED_TOTAL, help: 'Total users registered' }),
    makeCounterProvider({
      name: EMAILS_SENT_TOTAL,
      help: 'Total emails sent',
      labelNames: ['kind'],
    }),
    makeCounterProvider({
      name: EMAILS_FAILED_TOTAL,
      help: 'Total emails that failed to send',
      labelNames: ['kind'],
    }),
  ],
  exports: [
    getToken(USERS_REGISTERED_TOTAL),
    getToken(EMAILS_SENT_TOTAL),
    getToken(EMAILS_FAILED_TOTAL),
  ],
})
export class MetricsModule {}
