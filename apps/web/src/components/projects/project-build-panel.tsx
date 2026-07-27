'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useProjectConfig, useUpdateProjectConfig } from '@/lib/queries/project-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

const VERSION_NAME_PATTERN = /^.{1,20}$/;

export function ProjectBuildPanel({
  organizationId,
  projectId,
  canEdit,
}: {
  organizationId: string;
  projectId: string;
  canEdit: boolean;
}) {
  const configQuery = useProjectConfig(organizationId, projectId);
  const updateConfig = useUpdateProjectConfig(organizationId, projectId);

  const [versionName, setVersionName] = React.useState('1.0.0');
  const [versionCode, setVersionCode] = React.useState(1);

  React.useEffect(() => {
    if (configQuery.data) {
      setVersionName(configQuery.data.versionName);
      setVersionCode(configQuery.data.versionCode);
    }
  }, [configQuery.data]);

  if (configQuery.isLoading) {
    return <Skeleton className="h-64 w-full max-w-xl" />;
  }

  if (!configQuery.data) {
    return <p className="text-muted-foreground text-sm">Project configuration not found.</p>;
  }

  const isValidVersionName = VERSION_NAME_PATTERN.test(versionName);
  const isValidVersionCode = Number.isInteger(versionCode) && versionCode >= 1;

  async function handleSave() {
    try {
      await updateConfig.mutateAsync({ versionName, versionCode });
      toast.success('Build settings updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update build settings');
    }
  }

  async function handleBumpVersionCode() {
    const next = versionCode + 1;
    setVersionCode(next);
    try {
      await updateConfig.mutateAsync({ versionCode: next });
      toast.success(`Version code bumped to ${next}`);
    } catch (error) {
      setVersionCode(versionCode);
      toast.error(error instanceof Error ? error.message : 'Failed to bump version code');
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Build</CardTitle>
        <CardDescription>
          The version name and code embedded in every generated Android project. The version code
          must increase on every release you intend to publish to the Play Store.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="config-version-name">Version name</Label>
          <Input
            id="config-version-name"
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            placeholder="1.0.0"
            disabled={!canEdit}
            className="max-w-40"
          />
          {!isValidVersionName && (
            <p className="text-destructive text-xs">Must be 1–20 characters.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="config-version-code">Version code</Label>
          <div className="flex items-center gap-2">
            <Input
              id="config-version-code"
              type="number"
              min={1}
              value={versionCode}
              onChange={(e) => setVersionCode(Number(e.target.value))}
              disabled={!canEdit}
              className="max-w-32"
            />
            {canEdit && (
              <Button type="button" variant="outline" size="sm" onClick={handleBumpVersionCode}>
                Bump
              </Button>
            )}
          </div>
          {!isValidVersionCode && (
            <p className="text-destructive text-xs">Must be a whole number, 1 or greater.</p>
          )}
        </div>
      </CardContent>
      {canEdit && (
        <CardFooter>
          <Button
            onClick={handleSave}
            disabled={updateConfig.isPending || !isValidVersionName || !isValidVersionCode}
          >
            {updateConfig.isPending && <Loader2 className="animate-spin" />}
            Save changes
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
