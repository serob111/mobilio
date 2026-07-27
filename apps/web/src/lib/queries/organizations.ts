import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Organization, OrganizationSummary } from '@/lib/types';

export function useOrganizations(enabled = true) {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.get<OrganizationSummary[]>('/organizations'),
    enabled,
  });
}

export function useOrganization(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organizations', organizationId],
    queryFn: () => api.get<Organization>(`/organizations/${organizationId}`),
    enabled: !!organizationId,
  });
}

export function useUpdateOrganization(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name?: string }) =>
      api.patch<Organization>(`/organizations/${organizationId}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}
