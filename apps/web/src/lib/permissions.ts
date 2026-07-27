import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import { Action, getPermissionRulesForRole, OrgRole, RbacSubject } from '@ag2/contracts';

export type AppAbility = MongoAbility<[Action, RbacSubject]>;

/**
 * Mirrors apps/api's CaslAbilityFactory so the dashboard can hide/disable
 * actions the API would reject anyway — driven by the same canonical
 * matrix in @ag2/contracts, not a hand-maintained copy. This is a UX
 * convenience only; the API re-checks every request server-side.
 */
export function buildAbilityForRole(role: OrgRole): AppAbility {
  const builder = new AbilityBuilder<AppAbility>(createMongoAbility);

  for (const rule of getPermissionRulesForRole(role)) {
    builder.can(rule.action, rule.subject);
  }

  return builder.build();
}
