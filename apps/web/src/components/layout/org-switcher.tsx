'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, PlusCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { OrganizationSummary } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function OrgSwitcher({
  organizations,
  currentOrgId,
}: {
  organizations: OrganizationSummary[];
  currentOrgId: string | undefined;
}) {
  const router = useRouter();
  const current = organizations.find((org) => org.id === currentOrgId) ?? organizations[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between px-2"
          aria-label="Switch organization"
        >
          <span className="truncate font-medium">{current?.name ?? 'Select organization'}</span>
          <ChevronsUpDown className="text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onSelect={() => router.push(`/orgs/${org.id}/dashboard`)}
            className="justify-between"
          >
            <span className="truncate">{org.name}</span>
            {org.id === current?.id && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className={cn('text-muted-foreground')}>
          <PlusCircle />
          New organization (coming soon)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
