import {
  AndroidPermission,
  ApiKeyScope,
  BuildArtifactKind,
  BuildArtifactType,
  BuildJobStatus,
  BuildTargetPlatform,
  OrgPlan,
  OrgRole,
  ProjectSourceType,
  ProjectStatus,
  ScreenOrientation,
  StatusBarStyle,
} from '@ag2/contracts';

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  plan: OrgPlan;
  role: OrgRole;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: OrgPlan;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  organizationId: string;
  name: string;
  createdAt: string;
}

export interface MembershipUser {
  id: string;
  email: string;
  name: string;
}

export interface Membership {
  id: string;
  role: OrgRole;
  teamId: string | null;
  user: MembershipUser;
  createdAt: string;
}

export interface Project {
  id: string;
  organizationId: string;
  createdByUserId: string;
  name: string;
  slug: string;
  sourceType: ProjectSourceType;
  sourceUrl: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectConfig {
  id: string;
  projectId: string;
  appName: string | null;
  packageName: string;
  versionName: string;
  versionCode: number;
  iconStorageKey: string | null;
  splashStorageKey: string | null;
  themeColor: string;
  orientation: ScreenOrientation;
  statusBarStyle: StatusBarStyle;
  allowedNavigationDomains: string[];
  deepLinkScheme: string | null;
  customUserAgent: string | null;
  permissions: AndroidPermission[];
  createdAt: string;
  updatedAt: string;
}

export interface SigningKeySummary {
  alias: string;
  sha256Fingerprint: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreatedApiKey {
  id: string;
  plainTextKey: string;
  keyPrefix: string;
}

export interface BuildArtifact {
  id: string;
  kind: BuildArtifactKind;
  contentType: string;
  sizeBytes: string;
  createdAt: string;
}

export interface Build {
  id: string;
  projectId: string;
  organizationId: string;
  triggeredByUserId: string;
  platform: BuildTargetPlatform;
  artifactType: BuildArtifactType;
  status: BuildJobStatus;
  errorMessage: string | null;
  logStorageKey: string | null;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  artifacts: BuildArtifact[];
}

export interface BuildProjectSummary {
  id: string;
  name: string;
  slug: string;
}

export interface BuildWithProject extends Build {
  project: BuildProjectSummary;
}

export interface OrgBuildCounts {
  total: number;
  queued: number;
  inProgress: number;
  succeeded: number;
  failed: number;
  cancelled: number;
}

export interface OrgBuildsOverview {
  counts: OrgBuildCounts;
  recent: BuildWithProject[];
}

export interface AuditLogEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  actorUserId: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  total: number;
}
