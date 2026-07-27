'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useOrg } from '@/lib/org-context';
import { useAuditLogs } from '@/lib/queries/audit-logs';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAGE_SIZE = 25;

export default function AuditLogsPage() {
  const { organizationId } = useOrg();
  const [page, setPage] = React.useState(1);
  const auditLogsQuery = useAuditLogs(organizationId, page, PAGE_SIZE);

  const total = auditLogsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader title="Audit Log" description="Every change made in this organization." />

      <div className="p-8">
        {auditLogsQuery.isLoading && <Skeleton className="h-96 w-full" />}

        {auditLogsQuery.data && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogsQuery.data.items.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-sm">{entry.action}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {entry.targetType}
                      {entry.targetId ? ` · ${entry.targetId.slice(0, 8)}…` : ''}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(entry.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {auditLogsQuery.data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground text-center">
                      No activity yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                Page {page} of {totalPages} · {total} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
