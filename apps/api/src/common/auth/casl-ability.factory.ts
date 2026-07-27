import { Injectable } from '@nestjs/common';
import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import { Action, getPermissionRulesForRole, OrgRole, RbacSubject } from '@ag2/contracts';

export type AppAbility = MongoAbility<[Action, RbacSubject]>;

@Injectable()
export class CaslAbilityFactory {
  createForRole(role: OrgRole): AppAbility {
    const builder = new AbilityBuilder<AppAbility>(createMongoAbility);

    for (const rule of getPermissionRulesForRole(role)) {
      builder.can(rule.action, rule.subject);
    }

    return builder.build();
  }
}
