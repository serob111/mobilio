export const RBAC_SUBJECTS = [
  'Organization',
  'Team',
  'Membership',
  'Project',
  'ApiKey',
  'Billing',
  'AuditLog',
  'all',
] as const;

export type RbacSubject = (typeof RBAC_SUBJECTS)[number];
