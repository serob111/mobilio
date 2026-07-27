import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiKeyScope } from '@ag2/contracts';
import { api } from '@/lib/api-client';
import { ApiKey, CreatedApiKey } from '@/lib/types';

export function useApiKeys(organizationId: string) {
  return useQuery({
    queryKey: ['organizations', organizationId, 'api-keys'],
    queryFn: () => api.get<ApiKey[]>(`/organizations/${organizationId}/api-keys`),
  });
}

export function useCreateApiKey(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string; scopes: ApiKeyScope[]; expiresAt?: string }) =>
      api.post<CreatedApiKey>(`/organizations/${organizationId}/api-keys`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['organizations', organizationId, 'api-keys'],
      });
    },
  });
}

export function useRevokeApiKey(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (apiKeyId: string) =>
      api.delete(`/organizations/${organizationId}/api-keys/${apiKeyId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['organizations', organizationId, 'api-keys'],
      });
    },
  });
}
