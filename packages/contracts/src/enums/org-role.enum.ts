export enum OrgRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  DEVELOPER = 'DEVELOPER',
  BILLING = 'BILLING',
  VIEWER = 'VIEWER',
}

export const ORG_ROLES: readonly OrgRole[] = Object.values(OrgRole);
