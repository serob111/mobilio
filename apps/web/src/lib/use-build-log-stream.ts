'use client';

import * as React from 'react';
import { io, Socket } from 'socket.io-client';
import { BuildJobStatus } from '@ag2/contracts';
import { env } from './env';
import { getAccessToken } from './api-client';

export interface BuildLogLine {
  seq: number;
  timestamp: string;
  line: string;
}

interface UseBuildLogStreamResult {
  lines: BuildLogLine[];
  liveStatus: BuildJobStatus | null;
  connected: boolean;
}

/** env.apiUrl already carries the "/api" HTTP prefix — the gateway lives at the bare origin under the "/builds" Socket.IO namespace, not behind that prefix. */
function socketOrigin(): string {
  return env.apiUrl.replace(/\/api\/?$/, '');
}

/** Subscribes to live build-log/status events over the API's WebSocket gateway while `active` is true (e.g. a log viewer dialog is open). */
export function useBuildLogStream(
  buildId: string | null,
  active: boolean,
): UseBuildLogStreamResult {
  const [lines, setLines] = React.useState<BuildLogLine[]>([]);
  const [liveStatus, setLiveStatus] = React.useState<BuildJobStatus | null>(
    null,
  );
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    setLines([]);
    setLiveStatus(null);
    setConnected(false);

    if (!buildId || !active) {
      return;
    }

    const socket: Socket = io(`${socketOrigin()}/builds`, {
      auth: { token: getAccessToken() },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('subscribe', { buildId });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('log', (message: BuildLogLine) => {
      setLines((prev) => [...prev, message]);
    });
    socket.on('status', (message: { status: BuildJobStatus }) => {
      setLiveStatus(message.status);
    });

    return () => {
      socket.emit('unsubscribe', { buildId });
      socket.disconnect();
    };
  }, [buildId, active]);

  return { lines, liveStatus, connected };
}
