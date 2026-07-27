import * as React from 'react';

import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export function StatTile({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <Card className={cn('gap-0 py-5', className)}>
      <CardContent className="flex items-start justify-between px-5">
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}
