'use client';

import * as React from 'react';
import { ScrollText } from 'lucide-react';

import { Action } from '@ag2/contracts';
import { useOrg } from '@/lib/org-context';
import { useBuilds } from '@/lib/queries/builds';
import { Build } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BuildStatusBadge } from './build-status-badge';
import { BuildLogDialog } from './build-log-dialog';
import { TriggerBuildDialog } from './trigger-build-dialog';

export function BuildsPanel({
  organizationId,
  projectId,
}: {
  organizationId: string;
  projectId: string;
}) {
  const { ability } = useOrg();
  const buildsQuery = useBuilds(organizationId, projectId);
  const [selectedBuild, setSelectedBuild] = React.useState<Build | null>(null);
  const [logDialogOpen, setLogDialogOpen] = React.useState(false);

  const canTrigger = ability.can(Action.TRIGGER_BUILD, 'Project');

  function openLogs(build: Build) {
    setSelectedBuild(build);
    setLogDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Each build validates the project&apos;s source and produces a manifest
          artifact.
        </p>
        {canTrigger && (
          <TriggerBuildDialog
            organizationId={organizationId}
            projectId={projectId}
            onTriggered={openLogs}
          />
        )}
      </div>

      {buildsQuery.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !buildsQuery.data || buildsQuery.data.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed p-8 text-center text-sm">
          No builds yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Artifact</TableHead>
              <TableHead>Queued</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {buildsQuery.data.map((build) => (
              <TableRow
                key={build.id}
                className="cursor-pointer"
                onClick={() => openLogs(build)}
              >
                <TableCell>
                  <BuildStatusBadge status={build.status} />
                </TableCell>
                <TableCell>{build.platform}</TableCell>
                <TableCell>{build.artifactType}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(build.queuedAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    <ScrollText />
                    Logs
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <BuildLogDialog
        organizationId={organizationId}
        projectId={projectId}
        build={selectedBuild}
        open={logDialogOpen}
        onOpenChange={setLogDialogOpen}
      />
    </div>
  );
}
