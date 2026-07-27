'use client';

import * as React from 'react';
import { OrgRole } from '@ag2/contracts';
import { AppAbility, buildAbilityForRole } from '@/lib/permissions';
import { OrganizationSummary } from '@/lib/types';

interface OrgContextValue {
  organizationId: string;
  role: OrgRole;
  ability: AppAbility;
}

const OrgContext = React.createContext<OrgContextValue | null>(null);

export function OrgProvider({
  organization,
  children,
}: {
  organization: OrganizationSummary;
  children: React.ReactNode;
}) {
  const value = React.useMemo<OrgContextValue>(
    () => ({
      organizationId: organization.id,
      role: organization.role,
      ability: buildAbilityForRole(organization.role),
    }),
    [organization.id, organization.role],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgContextValue {
  const ctx = React.useContext(OrgContext);
  if (!ctx) {
    throw new Error('useOrg must be used within OrgProvider');
  }
  return ctx;
}
