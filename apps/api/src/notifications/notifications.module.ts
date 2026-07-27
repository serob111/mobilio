import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { EmailQueueService } from './application/email-queue.service';
import { MailerService } from './infrastructure/mailer.service';
import { EmailProcessor } from './infrastructure/email.processor';

@Module({
  imports: [QueueModule],
  providers: [EmailQueueService, MailerService, EmailProcessor],
  exports: [EmailQueueService],
})
export class NotificationsModule {}
