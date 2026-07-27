'use client';

import { useParams } from 'next/navigation';
import { FolderKanban, Hammer, Users2, CheckCircle2 } from 'lucide-react';

import { Action } from '@ag2/contracts';
import { useOrg } from '@/lib/org-context';
import { useProjects } from '@/lib/queries/projects';
import { useMemberships } from '@/lib/queries/memberships';
import { useOrgBuildsOverview } from '@/lib/queries/builds';
import { PageHeader } from '@/components/layout/page-header';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { StatTile } from '@/components/dashboard/stat-tile';
import { BuildStatusBar } from '@/components/dashboard/build-status-bar';
import { RecentBuildsList } from '@/components/dashboard/recent-builds-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const params = useParams<{ orgId: string }>();
  const { ability } = useOrg();

  const projectsQuery = useProjects(params.orgId);
  const membershipsQuery = useMemberships(params.orgId);
  const overviewQuery = useOrgBuildsOverview(params.orgId, 8);

  const isLoading = projectsQuery.isLoading || membershipsQuery.isLoading || overviewQuery.isLoading;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your projects and builds."
        action={
          ability.can(Action.CREATE, 'Project') ? (
            <CreateProjectDialog organizationId={params.orgId} />
          ) : undefined
        }
      />

      <div className="space-y-6 p-8">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Total projects"
              value={projectsQuery.data?.length ?? 0}
              icon={FolderKanban}
            />
            <StatTile
              label="Total builds"
              value={overviewQuery.data?.counts.total ?? 0}
              icon={Hammer}
            />
            <StatTile
              label="Builds succeeded"
              value={overviewQuery.data?.counts.succeeded ?? 0}
              icon={CheckCircle2}
            />
            <StatTile
              label="Team members"
              value={membershipsQuery.data?.length ?? 0}
              icon={Users2}
            />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Recent builds</CardTitle>
            </CardHeader>
            <CardContent>
              {overviewQuery.isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <RecentBuildsList
                  organizationId={params.orgId}
                  builds={overviewQuery.data?.recent ?? []}
                />
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Build status</CardTitle>
            </CardHeader>
            <CardContent>
              {overviewQuery.isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <BuildStatusBar counts={overviewQuery.data?.counts ?? { total: 0, queued: 0, inProgress: 0, succeeded: 0, failed: 0, cancelled: 0 }} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
