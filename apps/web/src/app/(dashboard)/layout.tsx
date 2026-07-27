import { DashboardShell } from '@/components/layout/dashboard-shell';

// Every page under here is auth-gated and 100% client-rendered (session
// lives in a JS-only context, not a server-readable cookie) — there's no
// meaningful content to statically prerender, and attempting to forced a
// build-time crash (duplicate React instance in the prerender worker).
export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
