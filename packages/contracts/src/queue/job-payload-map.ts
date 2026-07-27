import { QueueName } from './queue-name.enum';
import { EmailJobPayload } from './email-job.contract';
import { BuildJobPayload } from './build-job.contract';

export interface QueueJobPayloadMap {
  readonly [QueueName.EMAILS]: EmailJobPayload;
  readonly [QueueName.BUILDS]: BuildJobPayload;
}
