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
import { AssetUploadField } from './asset-upload-field';

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function ProjectBrandingPanel({
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

  const [appName, setAppName] = React.useState('');
  const [packageName, setPackageName] = React.useState('');
  const [themeColor, setThemeColor] = React.useState('#4F46E5');

  React.useEffect(() => {
    if (configQuery.data) {
      setAppName(configQuery.data.appName ?? '');
      setPackageName(configQuery.data.packageName);
      setThemeColor(configQuery.data.themeColor);
    }
  }, [configQuery.data]);

  if (configQuery.isLoading) {
    return <Skeleton className="h-96 w-full max-w-xl" />;
  }

  if (!configQuery.data) {
    return <p className="text-muted-foreground text-sm">Project configuration not found.</p>;
  }

  const isValidColor = HEX_COLOR_PATTERN.test(themeColor);

  async function handleSave() {
    try {
      await updateConfig.mutateAsync({
        appName: appName.trim() || undefined,
        packageName: packageName.trim(),
        themeColor,
      });
      toast.success('Branding updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update branding');
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>
          Controls the generated app&apos;s identity: display name, Android application id,
          launcher icon, splash screen, and theme color.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="config-app-name">App name</Label>
          <Input
            id="config-app-name"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="My App"
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="config-package-name">Android application id</Label>
          <Input
            id="config-package-name"
            value={packageName}
            onChange={(e) => setPackageName(e.target.value)}
            placeholder="com.company.app"
            disabled={!canEdit}
          />
          <p className="text-muted-foreground text-xs">
            Reverse-domain identifier, e.g. com.company.app. Changing this after a build has been
            published to a store will be treated as a different app.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="config-theme-color">Theme color</Label>
          <div className="flex items-center gap-2">
            <input
              id="config-theme-color"
              type="color"
              value={isValidColor ? themeColor : '#4F46E5'}
              onChange={(e) => setThemeColor(e.target.value)}
              disabled={!canEdit}
              className="border-input h-9 w-12 shrink-0 cursor-pointer rounded-md border p-1 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Input
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              placeholder="#4F46E5"
              disabled={!canEdit}
              className="max-w-32 font-mono"
            />
          </div>
          {!isValidColor && (
            <p className="text-destructive text-xs">Must be a 6-digit hex color, e.g. #4F46E5.</p>
          )}
        </div>

        <AssetUploadField
          organizationId={organizationId}
          projectId={projectId}
          kind="icon"
          label="App icon"
          hint="PNG, ideally 1024×1024. Used to generate all Android launcher icon densities."
          canEdit={canEdit}
        />

        <AssetUploadField
          organizationId={organizationId}
          projectId={projectId}
          kind="splash"
          label="Splash screen"
          hint="PNG. Shown while the app is loading, composited over the theme color."
          canEdit={canEdit}
        />
      </CardContent>
      {canEdit && (
        <CardFooter>
          <Button onClick={handleSave} disabled={updateConfig.isPending || !isValidColor}>
            {updateConfig.isPending && <Loader2 className="animate-spin" />}
            Save changes
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
