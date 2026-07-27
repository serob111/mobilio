import { Redis } from 'ioredis';
import {
  buildLogsChannel,
  buildStatusChannel,
  BuildJobStatus,
  BuildLogMessage,
  BuildStatusMessage,
} from '@ag2/contracts';

/**
 * Publishes to Redis for live dashboard viewers (via the API's WebSocket
 * gateway) while also retaining every line in memory, so the same run
 * produces both the real-time stream and the durable `build.log` artifact
 * uploaded to object storage at the end — one pass, two consumers.
 */
export class BuildLogPublisher {
  private seq = 0;
  private readonly lines: string[] = [];

  constructor(
    private readonly redis: Redis,
    private readonly buildId: string,
  ) {}

  async log(line: string): Promise<void> {
    const message: BuildLogMessage = {
      seq: this.seq++,
      timestamp: new Date().toISOString(),
      line,
    };
    this.lines.push(`[${message.timestamp}] ${line}`);
    await this.redis.publish(buildLogsChannel(this.buildId), JSON.stringify(message));
  }

  async status(status: BuildJobStatus, errorMessage?: string): Promise<void> {
    const message: BuildStatusMessage = { status, errorMessage };
    await this.redis.publish(buildStatusChannel(this.buildId), JSON.stringify(message));
  }

  get fullLog(): string {
    return this.lines.length > 0 ? `${this.lines.join('\n')}\n` : '';
  }
}
