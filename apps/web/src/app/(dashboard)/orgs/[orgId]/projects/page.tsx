'use client';

import Link from 'next/link';
import { FolderKanban, Globe, Upload } from 'lucide-react';

import { Action } from '@ag2/contracts';
import { useOrg } from '@/lib/org-context';
import { useProjects } from '@/lib/queries/projects';
import { PageHeader } from '@/components/layout/page-header';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const statusVariant = {
  ACTIVE: 'success',
  DRAFT: 'secondary',
  ARCHIVED: 'outline',
} as const;

export default function ProjectsPage() {
  const { organizationId, ability } = useOrg();
  const projectsQuery = useProjects(organizationId);

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Websites and apps you're turning into native builds."
        action={
          ability.can(Action.CREATE, 'Project') ? (
            <CreateProjectDialog organizationId={organizationId} />
          ) : undefined
        }
      />

      <div className="p-8">
        {projectsQuery.isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        )}

        {projectsQuery.isError && (
          <p className="text-destructive text-sm">Failed to load projects.</p>
        )}

        {projectsQuery.data && projectsQuery.data.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
            <FolderKanban className="text-muted-foreground size-8" />
            <div>
              <p className="font-medium">No projects yet</p>
              <p className="text-muted-foreground text-sm">
                Create your first project to get started.
              </p>
            </div>
          </div>
        )}

        {projectsQuery.data && projectsQuery.data.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projectsQuery.data.map((project) => (
              <Link key={project.id} href={`/orgs/${organizationId}/projects/${project.id}`}>
                <Card className="h-full transition-colors hover:border-foreground/30">
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{project.name}</p>
                      <Badge variant={statusVariant[project.status]}>{project.status}</Badge>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                      {project.sourceType === 'URL' ? (
                        <>
                          <Globe className="size-3.5 shrink-0" />
                          <span className="truncate">{project.sourceUrl}</span>
                        </>
                      ) : (
                        <>
                          <Upload className="size-3.5 shrink-0" />
                          <span>Upload mode</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
