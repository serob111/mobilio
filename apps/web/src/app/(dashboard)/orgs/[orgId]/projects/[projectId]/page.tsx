'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Action } from '@ag2/contracts';
import { useOrg } from '@/lib/org-context';
import {
  useArchiveProject,
  useProject,
  useUpdateProject,
} from '@/lib/queries/projects';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BuildsPanel } from '@/components/builds/builds-panel';
import { ProjectBrandingPanel } from '@/components/projects/project-branding-panel';
import { ProjectPermissionsPanel } from '@/components/projects/project-permissions-panel';
import { ProjectBuildPanel } from '@/components/projects/project-build-panel';
import { ProjectSigningPanel } from '@/components/projects/project-signing-panel';

export default function ProjectDetailPage() {
  const params = useParams<{ orgId: string; projectId: string }>();
  const router = useRouter();
  const { ability } = useOrg();

  const projectQuery = useProject(params.orgId, params.projectId);
  const updateProject = useUpdateProject(params.orgId, params.projectId);
  const archiveProject = useArchiveProject(params.orgId);

  const [name, setName] = React.useState('');
  const [sourceUrl, setSourceUrl] = React.useState('');

  React.useEffect(() => {
    if (projectQuery.data) {
      setName(projectQuery.data.name);
      setSourceUrl(projectQuery.data.sourceUrl ?? '');
    }
  }, [projectQuery.data]);

  if (projectQuery.isLoading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full max-w-xl" />
      </div>
    );
  }

  if (!projectQuery.data) {
    return <p className="p-8 text-sm">Project not found.</p>;
  }

  const project = projectQuery.data;
  const canEdit = ability.can(Action.UPDATE, 'Project');
  const canArchive = ability.can(Action.DELETE, 'Project');

  async function handleSave() {
    try {
      await updateProject.mutateAsync({
        name,
        sourceUrl: project.sourceType === 'URL' ? sourceUrl : undefined,
      });
      toast.success('Project updated');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update project',
      );
    }
  }

  async function handleArchive() {
    try {
      await archiveProject.mutateAsync(project.id);
      toast.success('Project archived');
      router.push(`/orgs/${params.orgId}/projects`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to archive project',
      );
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <Link
        href={`/orgs/${params.orgId}/projects`}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-3.5" />
        Back to projects
      </Link>

      <Tabs defaultValue="builds">
        <TabsList>
          <TabsTrigger value="builds">Builds</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="build-config">Build</TabsTrigger>
          <TabsTrigger value="signing">Signing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="builds">
          <BuildsPanel
            organizationId={params.orgId}
            projectId={params.projectId}
          />
        </TabsContent>

        <TabsContent value="branding">
          <ProjectBrandingPanel
            organizationId={params.orgId}
            projectId={params.projectId}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="permissions">
          <ProjectPermissionsPanel
            organizationId={params.orgId}
            projectId={params.projectId}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="build-config">
          <ProjectBuildPanel
            organizationId={params.orgId}
            projectId={params.projectId}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="signing">
          <ProjectSigningPanel
            organizationId={params.orgId}
            projectId={params.projectId}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="settings" className="max-w-2xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>{project.name}</CardTitle>
                <Badge
                  variant={
                    project.status === 'ACTIVE' ? 'success' : 'secondary'
                  }
                >
                  {project.status}
                </Badge>
              </div>
              <CardDescription>
                {project.sourceType === 'URL' ? 'URL mode' : 'Upload mode'} ·
                slug: {project.slug}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project name</Label>
                <Input
                  id="project-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              {project.sourceType === 'URL' && (
                <div className="space-y-2">
                  <Label htmlFor="project-source-url">Website URL</Label>
                  <Input
                    id="project-source-url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
              )}
            </CardContent>
            {canEdit && (
              <CardFooter className="justify-between">
                <Button onClick={handleSave} disabled={updateProject.isPending}>
                  {updateProject.isPending && (
                    <Loader2 className="animate-spin" />
                  )}
                  Save changes
                </Button>

                {canArchive && project.status !== 'ARCHIVED' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">Archive project</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Archive &ldquo;{project.name}&rdquo;?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          The project will be hidden from the active list. This
                          can be reversed later, but not from this dashboard
                          yet.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleArchive}>
                          Archive
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
