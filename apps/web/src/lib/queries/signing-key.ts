import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { SigningKeySummary } from '@/lib/types';

function signingKeyKey(organizationId: string, projectId: string) {
  return ['organizations', organizationId, 'projects', projectId, 'signing'];
}

export function useSigningKey(organizationId: string, projectId: string) {
  return useQuery({
    queryKey: signingKeyKey(organizationId, projectId),
    queryFn: () =>
      api.get<SigningKeySummary>(
        `/organizations/${organizationId}/projects/${projectId}/signing`,
      ),
  });
}

export function useRegenerateSigningKey(organizationId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.post<SigningKeySummary>(
        `/organizations/${organizationId}/projects/${projectId}/signing/regenerate`,
        { confirm: true },
      ),
    onSuccess: (signingKey) => {
      queryClient.setQueryData(signingKeyKey(organizationId, projectId), signingKey);
    },
  });
}

export function useDownloadSigningKeyBackup(organizationId: string, projectId: string) {
  return useMutation({
    mutationFn: async () => {
      const { blob, filename } = await api.getBlob(
        `/organizations/${organizationId}/projects/${projectId}/signing/backup`,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename ?? 'release-keystore.p12';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
  });
}
