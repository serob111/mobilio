import { OrgBuildCounts } from '@/lib/types';

const SEGMENTS: {
  key: keyof Omit<OrgBuildCounts, 'total'>;
  label: string;
  barClassName: string;
  dotClassName: string;
}[] = [
  { key: 'succeeded', label: 'Succeeded', barClassName: 'bg-success', dotClassName: 'bg-success' },
  { key: 'inProgress', label: 'In progress', barClassName: 'bg-primary', dotClassName: 'bg-primary' },
  { key: 'queued', label: 'Queued', barClassName: 'bg-muted-foreground/50', dotClassName: 'bg-muted-foreground/50' },
  { key: 'failed', label: 'Failed', barClassName: 'bg-destructive', dotClassName: 'bg-destructive' },
  { key: 'cancelled', label: 'Cancelled', barClassName: 'bg-muted-foreground/25', dotClassName: 'bg-muted-foreground/25' },
];

export function BuildStatusBar({ counts }: { counts: OrgBuildCounts }) {
  if (counts.total === 0) {
    return <p className="text-muted-foreground text-sm">No builds yet.</p>;
  }

  const nonEmptySegments = SEGMENTS.filter((segment) => counts[segment.key] > 0);

  return (
    <div className="space-y-3">
      <div className="bg-muted flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
        {nonEmptySegments.map((segment) => (
          <div
            key={segment.key}
            className={segment.barClassName}
            style={{ width: `${(counts[segment.key] / counts.total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {nonEmptySegments.map((segment) => (
          <div key={segment.key} className="flex items-center gap-1.5 text-sm">
            <span className={`size-2 shrink-0 rounded-full ${segment.dotClassName}`} />
            <span className="text-muted-foreground">{segment.label}</span>
            <span className="font-medium tabular-nums">{counts[segment.key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
