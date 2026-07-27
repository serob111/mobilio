import { BuildJobStatus } from '../enums/build.enum';

/**
 * Redis pub/sub channel name the build-worker publishes live log lines to,
 * and the API's WebSocket gateway subscribes to (via PSUBSCRIBE on
 * `build-logs:*`) to fan them out to connected dashboard clients. Shared
 * so the two processes can't drift on the naming scheme.
 */
export function buildLogsChannel(buildId: string): string {
  return `build-logs:${buildId}`;
}

export interface BuildLogMessage {
  readonly seq: number;
  readonly timestamp: string;
  readonly line: string;
}

/** Companion channel carrying status transitions, separate from log lines
 * so the dashboard can react to completion without parsing log text. */
export function buildStatusChannel(buildId: string): string {
  return `build-status:${buildId}`;
}

export interface BuildStatusMessage {
  readonly status: BuildJobStatus;
  readonly errorMessage?: string;
}
