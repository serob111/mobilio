import { OrgRole } from '../enums/org-role.enum';
import { Action } from './action.enum';
import { RbacSubject } from './subject';

export interface PermissionRule {
  readonly action: Action;
  readonly subject: RbacSubject;
}

function rule(action: Action, subject: RbacSubject): PermissionRule {
  return { action, subject };
}

/**
 * Canonical, framework-agnostic RBAC policy for the fixed v1.0 OrgRole set.
 * apps/api's CaslAbilityFactory translates this into a real CASL Ability;
 * this matrix stays the single source of truth so it can be unit-tested
 * without pulling in NestJS or CASL. v2.2 (custom DB-driven roles) replaces
 * the lookup source, not this shape.
 */
export const ROLE_PERMISSION_MATRIX: Readonly<Record<OrgRole, readonly PermissionRule[]>> = {
  [OrgRole.OWNER]: [rule(Action.MANAGE, 'all')],

  [OrgRole.ADMIN]: [
    rule(Action.READ, 'Organization'),
    rule(Action.UPDATE, 'Organization'),
    rule(Action.MANAGE, 'Team'),
    rule(Action.MANAGE, 'Membership'),
    rule(Action.INVITE, 'Membership'),
    rule(Action.REMOVE_MEMBER, 'Membership'),
    rule(Action.MANAGE, 'Project'),
    rule(Action.TRIGGER_BUILD, 'Project'),
    rule(Action.DOWNLOAD_ARTIFACT, 'Project'),
    rule(Action.MANAGE, 'ApiKey'),
    rule(Action.READ, 'AuditLog'),
  ],

  [OrgRole.DEVELOPER]: [
    rule(Action.READ, 'Organization'),
    rule(Action.READ, 'Team'),
    rule(Action.READ, 'Membership'),
    rule(Action.CREATE, 'Project'),
    rule(Action.READ, 'Project'),
    rule(Action.UPDATE, 'Project'),
    rule(Action.TRIGGER_BUILD, 'Project'),
    rule(Action.DOWNLOAD_ARTIFACT, 'Project'),
  ],

  [OrgRole.BILLING]: [
    rule(Action.READ, 'Organization'),
    rule(Action.MANAGE, 'Billing'),
    rule(Action.READ, 'AuditLog'),
  ],

  [OrgRole.VIEWER]: [
    rule(Action.READ, 'Organization'),
    rule(Action.READ, 'Team'),
    rule(Action.READ, 'Project'),
  ],
};

export function getPermissionRulesForRole(role: OrgRole): readonly PermissionRule[] {
  return ROLE_PERMISSION_MATRIX[role];
}
