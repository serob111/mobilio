import {
  BuildArtifactType,
  BuildJobPayload,
  BuildTargetPlatform,
  ProjectSourceType,
} from '@ag2/contracts';
import { SiteFetchResult } from '../site/site-fetcher';

export interface BuildManifest {
  readonly manifestVersion: 1;
  readonly build: {
    readonly id: string;
    readonly platform: BuildTargetPlatform;
    readonly artifactType: BuildArtifactType;
    readonly triggeredByUserId: string;
    readonly requestedAt: string;
  };
  readonly project: {
    readonly id: string;
    readonly organizationId: string;
    readonly sourceType: ProjectSourceType;
    readonly sourceUrl: string;
  };
  readonly sourceValidation: SiteFetchResult;
  readonly generatedAt: string;
}

export function buildManifest(
  payload: BuildJobPayload,
  sourceUrl: string,
  siteResult: SiteFetchResult,
): BuildManifest {
  return {
    manifestVersion: 1,
    build: {
      id: payload.buildId,
      platform: payload.platform,
      artifactType: payload.artifactType,
      triggeredByUserId: payload.triggeredByUserId,
      requestedAt: payload.requestedAt,
    },
    project: {
      id: payload.projectId,
      organizationId: payload.organizationId,
      sourceType: payload.projectSourceType,
      sourceUrl,
    },
    sourceValidation: siteResult,
    generatedAt: new Date().toISOString(),
  };
}
