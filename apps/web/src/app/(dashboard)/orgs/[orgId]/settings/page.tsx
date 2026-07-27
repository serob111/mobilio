'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Action } from '@ag2/contracts';
import { useOrg } from '@/lib/org-context';
import { useOrganization, useUpdateOrganization } from '@/lib/queries/organizations';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function OrgSettingsPage() {
  const { organizationId, ability } = useOrg();
  const organizationQuery = useOrganization(organizationId);
  const updateOrganization = useUpdateOrganization(organizationId);

  const [name, setName] = React.useState('');

  React.useEffect(() => {
    if (organizationQuery.data) {
      setName(organizationQuery.data.name);
    }
  }, [organizationQuery.data]);

  const canUpdate = ability.can(Action.UPDATE, 'Organization');

  async function handleSave() {
    try {
      await updateOrganization.mutateAsync({ name });
      toast.success('Organization updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update organization');
    }
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage your organization." />

      <div className="max-w-xl space-y-6 p-8">
        {organizationQuery.isLoading && <Skeleton className="h-48 w-full" />}

        {organizationQuery.data && (
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization name</Label>
                <Input
                  id="org-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canUpdate}
                />
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <div>
                  <Badge variant="secondary">{organizationQuery.data.plan}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <p className="text-muted-foreground text-sm">{organizationQuery.data.slug}</p>
              </div>
            </CardContent>
            {canUpdate && (
              <CardFooter>
                <Button onClick={handleSave} disabled={updateOrganization.isPending}>
                  {updateOrganization.isPending && <Loader2 className="animate-spin" />}
                  Save changes
                </Button>
              </CardFooter>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
