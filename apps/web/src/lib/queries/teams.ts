import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Team } from '@/lib/types';

export function useTeams(organizationId: string) {
  return useQuery({
    queryKey: ['organizations', organizationId, 'teams'],
    queryFn: () => api.get<Team[]>(`/organizations/${organizationId}/teams`),
  });
}

export function useCreateTeam(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string }) =>
      api.post<Team>(`/organizations/${organizationId}/teams`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations', organizationId, 'teams'] });
    },
  });
}

export function useDeleteTeam(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teamId: string) =>
      api.delete(`/organizations/${organizationId}/teams/${teamId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations', organizationId, 'teams'] });
    },
  });
}
