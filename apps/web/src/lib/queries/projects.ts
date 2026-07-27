import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProjectSourceType } from '@ag2/contracts';
import { api } from '@/lib/api-client';
import { Project } from '@/lib/types';

export function useProjects(organizationId: string) {
  return useQuery({
    queryKey: ['organizations', organizationId, 'projects'],
    queryFn: () => api.get<Project[]>(`/organizations/${organizationId}/projects`),
  });
}

export function useProject(organizationId: string, projectId: string) {
  return useQuery({
    queryKey: ['organizations', organizationId, 'projects', projectId],
    queryFn: () => api.get<Project>(`/organizations/${organizationId}/projects/${projectId}`),
  });
}

export interface CreateProjectInput {
  name: string;
  sourceType: ProjectSourceType;
  sourceUrl?: string;
}

export function useCreateProject(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      api.post<Project>(`/organizations/${organizationId}/projects`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['organizations', organizationId, 'projects'],
      });
    },
  });
}

export function useUpdateProject(organizationId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name?: string; sourceUrl?: string }) =>
      api.patch<Project>(`/organizations/${organizationId}/projects/${projectId}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['organizations', organizationId, 'projects'],
      });
    },
  });
}

export function useArchiveProject(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) =>
      api.delete<Project>(`/organizations/${organizationId}/projects/${projectId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['organizations', organizationId, 'projects'],
      });
    },
  });
}
