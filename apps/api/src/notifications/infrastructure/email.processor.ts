import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Counter } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { EmailJobPayload, QueueName } from '@ag2/contracts';
import { EMAILS_FAILED_TOTAL, EMAILS_SENT_TOTAL } from '../../observability/metrics/metric-names';
import { MailerService } from './mailer.service';
import { renderWelcomeEmail } from './templates/welcome-email.template';

@Processor(QueueName.EMAILS)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly mailer: MailerService,
    @InjectMetric(EMAILS_SENT_TOTAL) private readonly sentCounter: Counter<string>,
    @InjectMetric(EMAILS_FAILED_TOTAL) private readonly failedCounter: Counter<string>,
  ) {
    super();
  }

  async process(job: Job<EmailJobPayload>): Promise<void> {
    try {
      await this.dispatch(job.data);
      this.sentCounter.inc({ kind: job.data.kind });
    } catch (error) {
      this.failedCounter.inc({ kind: job.data.kind });
      this.logger.error(`Failed to send ${job.data.kind} email to ${job.data.email}`, error);
      throw error;
    }
  }

  private async dispatch(payload: EmailJobPayload): Promise<void> {
    switch (payload.kind) {
      case 'welcome': {
        const content = renderWelcomeEmail(payload.name);
        await this.mailer.send({ to: payload.email, ...content });
        return;
      }
    }
  }
}
