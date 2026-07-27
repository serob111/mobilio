import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory } from './casl-ability.factory';
import { PERMISSION_KEY, RequiredPermission } from './require-permission.decorator';
import { AuthenticatedRequest } from './authenticated-request';

/**
 * Must run after OrgContextGuard, which populates request.membership.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: CaslAbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<RequiredPermission | undefined>(
      PERMISSION_KEY,
      context.getHandler(),
    );

    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.membership) {
      throw new ForbiddenException('Missing organization context');
    }

    const ability = this.abilityFactory.createForRole(request.membership.role);

    if (!ability.can(required.action, required.subject)) {
      throw new ForbiddenException(
        `Missing permission: ${required.action} on ${required.subject}`,
      );
    }

    return true;
  }
}
