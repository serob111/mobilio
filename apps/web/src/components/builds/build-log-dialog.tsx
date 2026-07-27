'use client';

import * as React from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { BuildJobStatus } from '@ag2/contracts';
import {
  useArtifactDownloadUrl,
  useBuild,
  useBuildLogs,
} from '@/lib/queries/builds';
import { useBuildLogStream } from '@/lib/use-build-log-stream';
import { Build } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BuildStatusBadge } from './build-status-badge';

const TERMINAL_STATUSES = new Set<BuildJobStatus>([
  BuildJobStatus.SUCCEEDED,
  BuildJobStatus.FAILED,
  BuildJobStatus.CANCELLED,
]);

export function BuildLogDialog({
  organizationId,
  projectId,
  build,
  open,
  onOpenChange,
}: {
  organizationId: string;
  projectId: string;
  build: Build | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const buildId = build?.id ?? null;
  const buildQuery = useBuild(organizationId, projectId, buildId);
  const { lines, liveStatus, connected } = useBuildLogStream(buildId, open);
  const downloadUrl = useArtifactDownloadUrl(organizationId);
  const logRef = React.useRef<HTMLDivElement>(null);

  const current = buildQuery.data ?? build;
  const status = liveStatus ?? current?.status ?? null;

  // The live stream has no history/replay — a build that reaches a
  // terminal state before the socket finishes subscribing leaves `lines`
  // empty forever. Once that's detected, backfill from the persisted log.
  const needsLogBackfill =
    lines.length === 0 && Boolean(status && TERMINAL_STATUSES.has(status));
  const logsQuery = useBuildLogs(
    organizationId,
    projectId,
    buildId,
    open && needsLogBackfill,
  );

  React.useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [lines]);

  async function handleDownload(artifactId: string) {
    if (!buildId) return;
    try {
      const result = await downloadUrl.mutateAsync({ projectId, buildId, artifactId });
      window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to get download link',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Build logs</DialogTitle>
            {status && <BuildStatusBadge status={status} />}
          </div>
          <DialogDescription>
            {current?.platform} · {current?.artifactType}
            {open &&
            !connected &&
            !TERMINAL_STATUSES.has(status ?? BuildJobStatus.QUEUED)
              ? ' · connecting…'
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div
          ref={logRef}
          className="bg-muted/50 min-h-[16rem] flex-1 overflow-y-auto rounded-md border p-3 font-mono text-xs"
        >
          {lines.length === 0 && logsQuery.data ? (
            <pre className="whitespace-pre-wrap">{logsQuery.data}</pre>
          ) : lines.length === 0 ? (
            <p className="text-muted-foreground">
              {needsLogBackfill ? 'Loading log…' : 'Waiting for log output…'}
            </p>
          ) : (
            lines.map((line, index) => (
              // `seq` resets to 0 on each BullMQ retry attempt (a fresh
              // BuildLogPublisher per attempt), so it alone isn't a stable
              // React key across a retried build — combine with the append
              // position, which is safe since `lines` is append-only.
              <div key={`${index}-${line.seq}`} className="whitespace-pre-wrap">
                <span className="text-muted-foreground">
                  {new Date(line.timestamp).toLocaleTimeString()}{' '}
                </span>
                {line.line}
              </div>
            ))
          )}
        </div>

        {current && current.artifacts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {current.artifacts.map((artifact) => (
              <Button
                key={artifact.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDownload(artifact.id)}
                disabled={downloadUrl.isPending}
              >
                {downloadUrl.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Download />
                )}
                {artifact.kind.toLowerCase()}
              </Button>
            ))}
          </div>
        )}

        {current?.status === BuildJobStatus.FAILED && current.errorMessage && (
          <p className="text-destructive text-sm">{current.errorMessage}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
