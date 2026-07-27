import { Smartphone } from 'lucide-react';

import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'from-brand-from to-brand-to text-primary-foreground flex items-center justify-center rounded-lg bg-gradient-to-br shadow-sm',
        className,
      )}
    >
      <Smartphone className="size-1/2" />
    </div>
  );
}
