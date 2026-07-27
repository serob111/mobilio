import { Loader2 } from 'lucide-react';
import { BuildJobStatus } from '@ag2/contracts';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { VariantProps } from 'class-variance-authority';

const STATUS_VARIANT: Record<
  BuildJobStatus,
  VariantProps<typeof badgeVariants>['variant']
> = {
  [BuildJobStatus.QUEUED]: 'secondary',
  [BuildJobStatus.IN_PROGRESS]: 'default',
  [BuildJobStatus.SUCCEEDED]: 'success',
  [BuildJobStatus.FAILED]: 'destructive',
  [BuildJobStatus.CANCELLED]: 'outline',
};

const STATUS_LABEL: Record<BuildJobStatus, string> = {
  [BuildJobStatus.QUEUED]: 'Queued',
  [BuildJobStatus.IN_PROGRESS]: 'In progress',
  [BuildJobStatus.SUCCEEDED]: 'Succeeded',
  [BuildJobStatus.FAILED]: 'Failed',
  [BuildJobStatus.CANCELLED]: 'Cancelled',
};

export function BuildStatusBadge({ status }: { status: BuildJobStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className="gap-1">
      {status === BuildJobStatus.IN_PROGRESS && (
        <Loader2 className="animate-spin" />
      )}
      {STATUS_LABEL[status]}
    </Badge>
  );
}
