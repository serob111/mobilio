import { BuildArtifactType, BuildTargetPlatform } from '../enums/build.enum';
import { ProjectSourceType } from '../enums/project.enum';

/**
 * Contract for the `builds` queue, consumed by the Build Engine worker.
 * `configVersion` lets the worker reject payloads produced by an API
 * version whose project-config schema it doesn't understand yet — bumped
 * whenever fields here change shape (e.g. once v1.3 adds branding/icons,
 * `configVersion: 2` can carry that without the worker guessing which
 * shape it received).
 */
export interface BuildJobPayload {
  readonly buildId: string;
  readonly projectId: string;
  readonly organizationId: string;
  readonly triggeredByUserId: string;
  readonly platform: BuildTargetPlatform;
  readonly artifactType: BuildArtifactType;
  readonly projectSourceType: ProjectSourceType;
  readonly projectSourceUrl: string | null;
  readonly configVersion: 1;
  readonly requestedAt: string;
}

export const BUILD_JOB_NAME = 'run-build';
