'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import {
  FolderKanban,
  History,
  KeyRound,
  LayoutDashboard,
  Settings,
  Users,
  UsersRound,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { OrganizationSummary } from '@/lib/types';
import { LogoMark } from './logo-mark';
import { OrgSwitcher } from './org-switcher';
import { UserMenu } from './user-menu';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function AppSidebar({ organizations }: { organizations: OrganizationSummary[] }) {
  const pathname = usePathname();
  const params = useParams<{ orgId?: string }>();
  const orgId = params?.orgId;

  const navItems: NavItem[] = orgId
    ? [
        { href: `/orgs/${orgId}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
        { href: `/orgs/${orgId}/projects`, label: 'Projects', icon: FolderKanban },
        { href: `/orgs/${orgId}/team`, label: 'Team', icon: Users },
        { href: `/orgs/${orgId}/teams`, label: 'Teams', icon: UsersRound },
        { href: `/orgs/${orgId}/api-keys`, label: 'API Keys', icon: KeyRound },
        { href: `/orgs/${orgId}/audit-logs`, label: 'Audit Log', icon: History },
        { href: `/orgs/${orgId}/settings`, label: 'Settings', icon: Settings },
      ]
    : [];

  return (
    <aside className="bg-sidebar text-sidebar-foreground flex h-svh w-64 shrink-0 flex-col border-r">
      <div className="flex items-center gap-2 px-4 py-4">
        <LogoMark className="size-7" />
        <span className="text-sm font-semibold">ag2</span>
      </div>

      <div className="px-3">
        <OrgSwitcher organizations={organizations} currentOrgId={orgId} />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t px-3 py-3">
        <UserMenu />
      </div>
    </aside>
  );
}
