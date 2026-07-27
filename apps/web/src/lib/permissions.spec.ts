import { Action, OrgRole } from '@ag2/contracts';
import { buildAbilityForRole } from './permissions';

describe('buildAbilityForRole', () => {
  it('grants OWNER unrestricted access', () => {
    const ability = buildAbilityForRole(OrgRole.OWNER);
    expect(ability.can(Action.DELETE, 'Project')).toBe(true);
    expect(ability.can(Action.MANAGE, 'Billing')).toBe(true);
  });

  it('restricts VIEWER to read-only', () => {
    const ability = buildAbilityForRole(OrgRole.VIEWER);
    expect(ability.can(Action.READ, 'Project')).toBe(true);
    expect(ability.can(Action.CREATE, 'Project')).toBe(false);
  });

  it('matches the same policy the API enforces for DEVELOPER', () => {
    const ability = buildAbilityForRole(OrgRole.DEVELOPER);
    expect(ability.can(Action.CREATE, 'Project')).toBe(true);
    expect(ability.can(Action.INVITE, 'Membership')).toBe(false);
  });
});
