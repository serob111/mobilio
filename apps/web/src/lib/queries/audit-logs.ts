import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AuditLogPage } from '@/lib/types';

export function useAuditLogs(organizationId: string, page: number, pageSize = 25) {
  return useQuery({
    queryKey: ['organizations', organizationId, 'audit-logs', page, pageSize],
    queryFn: () =>
      api.get<AuditLogPage>(
        `/organizations/${organizationId}/audit-logs?page=${page}&pageSize=${pageSize}`,
      ),
  });
}
