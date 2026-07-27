import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AndroidPermission, ScreenOrientation, StatusBarStyle } from '@ag2/contracts';
import { api } from '@/lib/api-client';
import { ProjectConfig } from '@/lib/types';

type AssetKind = 'icon' | 'splash';

function configKey(organizationId: string, projectId: string) {
  return ['organizations', organizationId, 'projects', projectId, 'config'];
}

export function useProjectConfig(organizationId: string, projectId: string) {
  return useQuery({
    queryKey: configKey(organizationId, projectId),
    queryFn: () =>
      api.get<ProjectConfig>(
        `/organizations/${organizationId}/projects/${projectId}/config`,
      ),
  });
}

export interface UpdateProjectConfigInput {
  appName?: string;
  packageName?: string;
  versionName?: string;
  versionCode?: number;
  themeColor?: string;
  orientation?: ScreenOrientation;
  statusBarStyle?: StatusBarStyle;
  allowedNavigationDomains?: string[];
  deepLinkScheme?: string;
  customUserAgent?: string;
  permissions?: AndroidPermission[];
}

export function useUpdateProjectConfig(organizationId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProjectConfigInput) =>
      api.patch<ProjectConfig>(
        `/organizations/${organizationId}/projects/${projectId}/config`,
        input,
      ),
    onSuccess: (config) => {
      queryClient.setQueryData(configKey(organizationId, projectId), config);
    },
  });
}

export function useAssetDownloadUrl(organizationId: string, projectId: string, kind: AssetKind) {
  return useQuery({
    queryKey: [...configKey(organizationId, projectId), kind, 'download-url'],
    queryFn: () =>
      api.get<{ downloadUrl: string | null }>(
        `/organizations/${organizationId}/projects/${projectId}/config/${kind}/download-url`,
      ),
  });
}

/** Requests a presigned S3 URL, PUTs the file directly to storage, then confirms the upload so the API can validate and record it. */
export function useUploadAsset(organizationId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ kind, file }: { kind: AssetKind; file: File }) => {
      const { uploadUrl } = await api.post<{ uploadUrl: string; storageKey: string }>(
        `/organizations/${organizationId}/projects/${projectId}/config/${kind}/upload-url`,
        { contentType: file.type },
      );

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error('Failed to upload file to storage');
      }

      return api.post<ProjectConfig>(
        `/organizations/${organizationId}/projects/${projectId}/config/${kind}/confirm`,
      );
    },
    onSuccess: (config, { kind }) => {
      queryClient.setQueryData(configKey(organizationId, projectId), config);
      void queryClient.invalidateQueries({
        queryKey: [...configKey(organizationId, projectId), kind, 'download-url'],
      });
    },
  });
}
