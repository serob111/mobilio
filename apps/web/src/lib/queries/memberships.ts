import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OrgRole } from '@ag2/contracts';
import { api } from '@/lib/api-client';
import { Membership } from '@/lib/types';

export function useMemberships(organizationId: string) {
  return useQuery({
    queryKey: ['organizations', organizationId, 'memberships'],
    queryFn: () => api.get<Membership[]>(`/organizations/${organizationId}/memberships`),
  });
}

export function useAddMembership(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { email: string; role: OrgRole; teamId?: string }) =>
      api.post<Membership>(`/organizations/${organizationId}/memberships`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['organizations', organizationId, 'memberships'],
      });
    },
  });
}

export function useUpdateMembershipRole(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ membershipId, role }: { membershipId: string; role: OrgRole }) =>
      api.patch<Membership>(`/organizations/${organizationId}/memberships/${membershipId}`, {
        role,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['organizations', organizationId, 'memberships'],
      });
    },
  });
}

export function useRemoveMembership(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (membershipId: string) =>
      api.delete(`/organizations/${organizationId}/memberships/${membershipId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['organizations', organizationId, 'memberships'],
      });
    },
  });
}
