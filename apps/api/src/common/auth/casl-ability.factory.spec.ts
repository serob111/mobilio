import { Action, OrgRole } from '@ag2/contracts';
import { CaslAbilityFactory } from './casl-ability.factory';

describe('CaslAbilityFactory', () => {
  const factory = new CaslAbilityFactory();

  it('grants OWNER every action on every subject', () => {
    const ability = factory.createForRole(OrgRole.OWNER);
    expect(ability.can(Action.DELETE, 'Project')).toBe(true);
    expect(ability.can(Action.MANAGE, 'Billing')).toBe(true);
    expect(ability.can(Action.INVITE, 'Membership')).toBe(true);
  });

  it('lets DEVELOPER create and read projects but not manage members', () => {
    const ability = factory.createForRole(OrgRole.DEVELOPER);
    expect(ability.can(Action.CREATE, 'Project')).toBe(true);
    expect(ability.can(Action.TRIGGER_BUILD, 'Project')).toBe(true);
    expect(ability.can(Action.INVITE, 'Membership')).toBe(false);
    expect(ability.can(Action.MANAGE, 'Billing')).toBe(false);
  });

  it('restricts VIEWER to read-only access', () => {
    const ability = factory.createForRole(OrgRole.VIEWER);
    expect(ability.can(Action.READ, 'Project')).toBe(true);
    expect(ability.can(Action.CREATE, 'Project')).toBe(false);
    expect(ability.can(Action.UPDATE, 'Project')).toBe(false);
    expect(ability.can(Action.DELETE, 'Project')).toBe(false);
  });

  it('lets BILLING manage billing but not touch projects', () => {
    const ability = factory.createForRole(OrgRole.BILLING);
    expect(ability.can(Action.MANAGE, 'Billing')).toBe(true);
    expect(ability.can(Action.READ, 'Project')).toBe(false);
  });
});
