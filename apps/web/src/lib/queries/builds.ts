import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BuildArtifactType, BuildTargetPlatform } from '@ag2/contracts';
import { api } from '@/lib/api-client';
import { Build, OrgBuildsOverview } from '@/lib/types';

function buildsKey(organizationId: string, projectId: string) {
  return ['organizations', organizationId, 'projects', projectId, 'builds'];
}

function isNonTerminal(status: Build['status']): boolean {
  return status === 'QUEUED' || status === 'IN_PROGRESS';
}

export function useBuilds(organizationId: string, projectId: string) {
  return useQuery({
    queryKey: buildsKey(organizationId, projectId),
    queryFn: () =>
      api.get<Build[]>(
        `/organizations/${organizationId}/projects/${projectId}/builds`,
      ),
    refetchInterval: (query) =>
      query.state.data?.some((build) => isNonTerminal(build.status))
        ? 5000
        : false,
  });
}

export function useBuild(
  organizationId: string,
  projectId: string,
  buildId: string | null,
) {
  return useQuery({
    queryKey: [...buildsKey(organizationId, projectId), buildId],
    queryFn: () =>
      api.get<Build>(
        `/organizations/${organizationId}/projects/${projectId}/builds/${buildId}`,
      ),
    enabled: Boolean(buildId),
    // The WebSocket status snapshot can update the dialog's status badge
    // ahead of this query (see BuildLogDialog), but artifacts only ever
    // come from this REST payload — poll until terminal so a completed
    // build's artifacts (and final status) reliably show up here too.
    refetchInterval: (query) =>
      query.state.data && isNonTerminal(query.state.data.status) ? 3000 : false,
  });
}

export function useOrgBuildsOverview(organizationId: string, limit = 8) {
  return useQuery({
    queryKey: ['organizations', organizationId, 'builds', 'overview', limit],
    queryFn: () =>
      api.get<OrgBuildsOverview>(`/organizations/${organizationId}/builds?limit=${limit}`),
    refetchInterval: (query) =>
      query.state.data?.recent.some((build) => isNonTerminal(build.status)) ? 5000 : false,
  });
}

export interface TriggerBuildInput {
  platform: BuildTargetPlatform;
  artifactType: BuildArtifactType;
}

export function useTriggerBuild(organizationId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TriggerBuildInput) =>
      api.post<Build>(
        `/organizations/${organizationId}/projects/${projectId}/builds`,
        input,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: buildsKey(organizationId, projectId),
      });
    },
  });
}

/**
 * Backfills the persisted log when the live WebSocket stream missed
 * everything — Redis pub/sub has no replay buffer, so a build that
 * finishes before the client finishes subscribing leaves the live view
 * empty even though the build succeeded.
 */
export function useBuildLogs(
  organizationId: string,
  projectId: string,
  buildId: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [...buildsKey(organizationId, projectId), buildId, 'logs'],
    queryFn: () =>
      api.getText(
        `/organizations/${organizationId}/projects/${projectId}/builds/${buildId}/logs`,
      ),
    enabled: enabled && Boolean(buildId),
  });
}

/** Scoped only to `organizationId` (not a project) so one instance can serve rows spanning multiple projects, e.g. the org-wide Dashboard's recent builds list. */
export function useArtifactDownloadUrl(organizationId: string) {
  return useMutation({
    mutationFn: (args: { projectId: string; buildId: string; artifactId: string }) =>
      api.get<{ downloadUrl: string }>(
        `/organizations/${organizationId}/projects/${args.projectId}/builds/${args.buildId}/artifacts/${args.artifactId}/download`,
      ),
  });
}
