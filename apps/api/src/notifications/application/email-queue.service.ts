import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EMAIL_JOB_NAME, EmailJobPayload, QueueName, WelcomeEmailJobPayload } from '@ag2/contracts';

@Injectable()
export class EmailQueueService {
  constructor(@InjectQueue(QueueName.EMAILS) private readonly queue: Queue<EmailJobPayload>) {}

  async enqueueWelcomeEmail(input: Omit<WelcomeEmailJobPayload, 'kind'>): Promise<void> {
    await this.queue.add(EMAIL_JOB_NAME, { kind: 'welcome', ...input });
  }
}
