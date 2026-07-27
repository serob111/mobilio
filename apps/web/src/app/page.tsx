'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth-context';
import { useOrganizations } from '@/lib/queries/organizations';
import { LandingPage } from '@/components/marketing/landing-page';

export default function IndexPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const organizationsQuery = useOrganizations(Boolean(user));

  React.useEffect(() => {
    if (isLoading || !user || !organizationsQuery.data) {
      return;
    }
    const firstOrg = organizationsQuery.data[0];
    router.replace(firstOrg ? `/orgs/${firstOrg.id}/dashboard` : '/account');
  }, [isLoading, user, organizationsQuery.data, router]);

  if (isLoading || user) {
    return null;
  }

  return <LandingPage />;
}
