'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth-context';
import { useOrganizations } from '@/lib/queries/organizations';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const organizationsQuery = useOrganizations();

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-svh items-center justify-center">
        <div className="w-64 space-y-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-5/6" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-svh">
      <AppSidebar organizations={organizationsQuery.data ?? []} />
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
