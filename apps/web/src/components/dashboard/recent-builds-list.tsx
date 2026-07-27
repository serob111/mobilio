'use client';

import Link from 'next/link';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { BuildJobStatus } from '@ag2/contracts';
import { useArtifactDownloadUrl } from '@/lib/queries/builds';
import { BuildWithProject } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { BuildStatusBadge } from '@/components/builds/build-status-badge';

export function RecentBuildsList({
  organizationId,
  builds,
}: {
  organizationId: string;
  builds: BuildWithProject[];
}) {
  const downloadUrl = useArtifactDownloadUrl(organizationId);

  if (builds.length === 0) {
    return (
      <p className="text-muted-foreground rounded-md border border-dashed p-8 text-center text-sm">
        No builds yet. Trigger one from a project to see it here.
      </p>
    );
  }

  async function handleDownload(build: BuildWithProject, artifactId: string) {
    try {
      const result = await downloadUrl.mutateAsync({
        projectId: build.project.id,
        buildId: build.id,
        artifactId,
      });
      window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to get download link');
    }
  }

  return (
    <div className="divide-border -mx-5 divide-y">
      {builds.map((build) => {
        const canDownload = build.status === BuildJobStatus.SUCCEEDED && build.artifacts.length > 0;

        return (
          <div key={build.id} className="flex items-center justify-between gap-4 px-5 py-3">
            <Link
              href={`/orgs/${organizationId}/projects/${build.project.id}`}
              className="hover:text-foreground min-w-0 flex-1"
            >
              <p className="truncate text-sm font-medium">{build.project.name}</p>
              <p className="text-muted-foreground text-xs">
                {build.platform} · {build.artifactType} ·{' '}
                {new Date(build.queuedAt).toLocaleString()}
              </p>
            </Link>

            <div className="flex shrink-0 items-center gap-2">
              <BuildStatusBadge status={build.status} />
              {canDownload &&
                build.artifacts.map((artifact) => (
                  <Button
                    key={artifact.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    title={`Download ${artifact.kind.toLowerCase()}`}
                    onClick={() => handleDownload(build, artifact.id)}
                    disabled={downloadUrl.isPending}
                  >
                    {downloadUrl.isPending ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Download />
                    )}
                  </Button>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
