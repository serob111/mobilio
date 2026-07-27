'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { AndroidPermission, ScreenOrientation, StatusBarStyle } from '@ag2/contracts';
import { useProjectConfig, useUpdateProjectConfig } from '@/lib/queries/project-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ORIENTATION_LABELS: Record<ScreenOrientation, string> = {
  [ScreenOrientation.ANY]: 'Any (follow device rotation)',
  [ScreenOrientation.PORTRAIT]: 'Portrait only',
  [ScreenOrientation.LANDSCAPE]: 'Landscape only',
};

const STATUS_BAR_LABELS: Record<StatusBarStyle, string> = {
  [StatusBarStyle.DEFAULT]: 'Default (matches system theme)',
  [StatusBarStyle.LIGHT]: 'Light icons',
  [StatusBarStyle.DARK]: 'Dark icons',
};

const PERMISSION_LABELS: Record<AndroidPermission, string> = {
  [AndroidPermission.CAMERA]: 'Camera',
  [AndroidPermission.LOCATION]: 'Location',
  [AndroidPermission.MICROPHONE]: 'Microphone',
  [AndroidPermission.STORAGE]: 'Storage',
  [AndroidPermission.NOTIFICATIONS]: 'Notifications',
};

const ALL_PERMISSIONS = Object.values(AndroidPermission);

const DOMAIN_PATTERN = /^[a-z0-9.-]+$/;

export function ProjectPermissionsPanel({
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

  const [orientation, setOrientation] = React.useState<ScreenOrientation>(ScreenOrientation.ANY);
  const [statusBarStyle, setStatusBarStyle] = React.useState<StatusBarStyle>(StatusBarStyle.DEFAULT);
  const [permissions, setPermissions] = React.useState<AndroidPermission[]>([]);
  const [allowedNavigationDomains, setAllowedNavigationDomains] = React.useState('');
  const [deepLinkScheme, setDeepLinkScheme] = React.useState('');
  const [customUserAgent, setCustomUserAgent] = React.useState('');

  React.useEffect(() => {
    if (configQuery.data) {
      setOrientation(configQuery.data.orientation);
      setStatusBarStyle(configQuery.data.statusBarStyle);
      setPermissions(configQuery.data.permissions);
      setAllowedNavigationDomains(configQuery.data.allowedNavigationDomains.join(', '));
      setDeepLinkScheme(configQuery.data.deepLinkScheme ?? '');
      setCustomUserAgent(configQuery.data.customUserAgent ?? '');
    }
  }, [configQuery.data]);

  if (configQuery.isLoading) {
    return <Skeleton className="h-96 w-full max-w-xl" />;
  }

  if (!configQuery.data) {
    return <p className="text-muted-foreground text-sm">Project configuration not found.</p>;
  }

  const domainList = allowedNavigationDomains
    .split(',')
    .map((domain) => domain.trim())
    .filter(Boolean);
  const invalidDomains = domainList.filter((domain) => !DOMAIN_PATTERN.test(domain));

  function togglePermission(permission: AndroidPermission, checked: boolean) {
    setPermissions((current) =>
      checked ? [...current, permission] : current.filter((p) => p !== permission),
    );
  }

  async function handleSave() {
    try {
      await updateConfig.mutateAsync({
        orientation,
        statusBarStyle,
        permissions,
        allowedNavigationDomains: domainList,
        deepLinkScheme: deepLinkScheme.trim() || undefined,
        customUserAgent: customUserAgent.trim() || undefined,
      });
      toast.success('Permissions & behavior updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update permissions');
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Permissions & behavior</CardTitle>
        <CardDescription>
          Controls device permissions, screen orientation, status bar style, deep linking, and
          which additional hosts the app&apos;s WebView is allowed to navigate to.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Screen orientation</Label>
          <Select value={orientation} onValueChange={(v) => setOrientation(v as ScreenOrientation)}>
            <SelectTrigger className="w-full" disabled={!canEdit}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(ScreenOrientation).map((value) => (
                <SelectItem key={value} value={value}>
                  {ORIENTATION_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status bar style</Label>
          <Select value={statusBarStyle} onValueChange={(v) => setStatusBarStyle(v as StatusBarStyle)}>
            <SelectTrigger className="w-full" disabled={!canEdit}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(StatusBarStyle).map((value) => (
                <SelectItem key={value} value={value}>
                  {STATUS_BAR_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Device permissions</Label>
          <div className="grid grid-cols-2 gap-2">
            {ALL_PERMISSIONS.map((permission) => (
              <label
                key={permission}
                className="flex items-center gap-2 text-sm font-normal"
              >
                <Checkbox
                  checked={permissions.includes(permission)}
                  onCheckedChange={(checked) => togglePermission(permission, checked === true)}
                  disabled={!canEdit}
                />
                {PERMISSION_LABELS[permission]}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="config-domains">Allowed navigation domains</Label>
          <Input
            id="config-domains"
            value={allowedNavigationDomains}
            onChange={(e) => setAllowedNavigationDomains(e.target.value)}
            placeholder="accounts.example.com, checkout.example.com"
            disabled={!canEdit}
          />
          <p className="text-muted-foreground text-xs">
            Comma-separated hostnames, in addition to the project&apos;s own source domain (always
            allowed).
          </p>
          {invalidDomains.length > 0 && (
            <p className="text-destructive text-xs">
              Not valid hostnames: {invalidDomains.join(', ')}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="config-deep-link">Deep link scheme</Label>
          <Input
            id="config-deep-link"
            value={deepLinkScheme}
            onChange={(e) => setDeepLinkScheme(e.target.value)}
            placeholder="myapp"
            disabled={!canEdit}
          />
          <p className="text-muted-foreground text-xs">
            Optional. Registers <code>myapp://</code> so links can open directly into the app.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="config-user-agent">Custom user agent suffix</Label>
          <Input
            id="config-user-agent"
            value={customUserAgent}
            onChange={(e) => setCustomUserAgent(e.target.value)}
            placeholder="MyApp/1.0"
            disabled={!canEdit}
          />
        </div>
      </CardContent>
      {canEdit && (
        <CardFooter>
          <Button onClick={handleSave} disabled={updateConfig.isPending || invalidDomains.length > 0}>
            {updateConfig.isPending && <Loader2 className="animate-spin" />}
            Save changes
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
