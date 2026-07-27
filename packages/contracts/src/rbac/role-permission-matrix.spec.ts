import { OrgRole } from '../enums/org-role.enum';
import { Action } from './action.enum';
import { getPermissionRulesForRole, ROLE_PERMISSION_MATRIX } from './role-permission-matrix';

describe('ROLE_PERMISSION_MATRIX', () => {
  it('defines rules for every OrgRole with no gaps', () => {
    for (const role of Object.values(OrgRole)) {
      expect(ROLE_PERMISSION_MATRIX[role].length).toBeGreaterThan(0);
    }
  });

  it('grants OWNER an unrestricted manage-all rule', () => {
    const rules = getPermissionRulesForRole(OrgRole.OWNER);
    expect(rules).toEqual([{ action: Action.MANAGE, subject: 'all' }]);
  });

  it('does not grant VIEWER any mutating action', () => {
    const mutatingActions = new Set([
      Action.MANAGE,
      Action.CREATE,
      Action.UPDATE,
      Action.DELETE,
      Action.INVITE,
      Action.REMOVE_MEMBER,
      Action.TRIGGER_BUILD,
    ]);
    const rules = getPermissionRulesForRole(OrgRole.VIEWER);
    const hasMutatingRule = rules.some((r) => mutatingActions.has(r.action));
    expect(hasMutatingRule).toBe(false);
  });

  it('does not grant DEVELOPER access to Billing or ApiKey management', () => {
    const rules = getPermissionRulesForRole(OrgRole.DEVELOPER);
    const restrictedSubjects = new Set(['Billing', 'ApiKey']);
    const hasRestrictedAccess = rules.some((r) => restrictedSubjects.has(r.subject));
    expect(hasRestrictedAccess).toBe(false);
  });

  it('grants BILLING role manage rights on Billing but not on Project', () => {
    const rules = getPermissionRulesForRole(OrgRole.BILLING);
    expect(rules).toContainEqual({ action: Action.MANAGE, subject: 'Billing' });
    expect(rules.some((r) => r.subject === 'Project')).toBe(false);
  });

  it('grants ADMIN the ability to invite and remove members but not manage Billing', () => {
    const rules = getPermissionRulesForRole(OrgRole.ADMIN);
    expect(rules).toContainEqual({ action: Action.INVITE, subject: 'Membership' });
    expect(rules).toContainEqual({ action: Action.REMOVE_MEMBER, subject: 'Membership' });
    expect(rules.some((r) => r.subject === 'Billing')).toBe(false);
  });
});
