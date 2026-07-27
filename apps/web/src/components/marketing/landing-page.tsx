import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  Hammer,
  KeyRound,
  ScrollText,
  Shield,
  Smartphone,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogoMark } from '@/components/layout/logo-mark';

const FEATURES = [
  { icon: Smartphone, label: 'Signed Android APK builds' },
  { icon: ScrollText, label: 'Live build logs & status' },
  { icon: Users, label: 'Team roles & permissions' },
  { icon: KeyRound, label: 'Scoped API keys & audit log' },
];

const STEPS = [
  {
    step: '1',
    title: 'Add your website',
    description: 'Point a project at any URL — no code changes required on your end.',
  },
  {
    step: '2',
    title: 'Trigger a build',
    description: 'ag2 validates the source and queues an isolated build job.',
  },
  {
    step: '3',
    title: 'Watch it happen',
    description: 'Stream build logs live over WebSocket as the job runs.',
  },
  {
    step: '4',
    title: 'Download the APK',
    description: 'Grab the signed build artifact the moment it succeeds.',
  },
];

export function LandingPage() {
  return (
    <div className="bg-background text-foreground min-h-svh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <LogoMark className="size-7" />
          <span className="text-sm font-semibold">ag2</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">
              Get started
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <div className="border-border bg-accent/50 text-accent-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
              <span className="bg-success size-1.5 rounded-full" />
              Build engine live — Android APK today
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Turn any website into a{' '}
              <span className="from-brand-from to-brand-to bg-gradient-to-r bg-clip-text text-transparent">
                native mobile app
              </span>
            </h1>
            <p className="text-muted-foreground max-w-lg text-lg text-pretty">
              Point ag2 at a URL, trigger a build, and watch real-time logs as it
              validates your site and produces a signed Android build — with
              role-based team access and a full audit trail from day one.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href="/register">
                  Get started free
                  <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
              {FEATURES.map((feature) => (
                <div key={feature.label} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" />
                  <span className="text-muted-foreground">{feature.label}</span>
                </div>
              ))}
            </div>
          </div>

          <Card className="from-card to-accent/30 border-none bg-gradient-to-br py-8 shadow-lg">
            <CardContent className="flex flex-col items-center gap-6">
              <div className="flex w-full items-center justify-between">
                <FlowNode icon={Globe} label="Your website" />
                <div className="bg-border h-px flex-1" />
                <FlowNode icon={Hammer} label="ag2 build" active />
                <div className="bg-border h-px flex-1" />
                <FlowNode icon={Smartphone} label="Android APK" />
              </div>
              <div className="bg-background/60 w-full space-y-1.5 rounded-lg border p-4 font-mono text-xs">
                <p className="text-muted-foreground">$ ag2 build trigger --platform android</p>
                <p className="text-success">✓ Source validated</p>
                <p className="text-success">✓ Manifest generated</p>
                <p className="text-muted-foreground">→ Streaming logs…</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="border-border border-t">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-center text-2xl font-semibold tracking-tight">How it works</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((item) => (
                <div key={item.step} className="space-y-2">
                  <div className="from-brand-from to-brand-to text-primary-foreground flex size-8 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold">
                    {item.step}
                  </div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-border border-t">
          <div className="mx-auto max-w-6xl px-6 py-16 text-center">
            <Shield className="text-muted-foreground mx-auto size-6" />
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Built for teams from the start
            </h2>
            <p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm">
              Organizations, teams, and CASL-driven role permissions — every
              mutating action is written to an audit log you can review anytime.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/register">
                Create your account
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-border text-muted-foreground border-t px-6 py-6 text-center text-sm">
        © {new Date().getFullYear()} ag2
      </footer>
    </div>
  );
}

function FlowNode({
  icon: Icon,
  label,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div
        className={
          active
            ? 'from-brand-from to-brand-to text-primary-foreground flex size-11 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm'
            : 'bg-accent text-accent-foreground flex size-11 items-center justify-center rounded-xl'
        }
      >
        <Icon className="size-5" />
      </div>
      <span className="text-muted-foreground w-16 text-xs">{label}</span>
    </div>
  );
}
