'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';

import { useOrganizations } from '@/lib/queries/organizations';
import { OrgProvider } from '@/lib/org-context';
import { Skeleton } from '@/components/ui/skeleton';

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ orgId: string }>();
  const organizationsQuery = useOrganizations();

  if (organizationsQuery.isLoading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const organization = organizationsQuery.data?.find((org) => org.id === params.orgId);

  if (!organization) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <p className="text-lg font-medium">Organization not found</p>
          <p className="text-muted-foreground text-sm">
            Either it doesn&apos;t exist or you&apos;re not a member of it.
          </p>
        </div>
      </div>
    );
  }

  return <OrgProvider organization={organization}>{children}</OrgProvider>;
}
