import { Global, Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OrgContextGuard } from './org-context.guard';
import { CaslAbilityFactory } from './casl-ability.factory';
import { PermissionsGuard } from './permissions.guard';

@Global()
@Module({
  providers: [TokenService, JwtAuthGuard, OrgContextGuard, CaslAbilityFactory, PermissionsGuard],
  exports: [TokenService, JwtAuthGuard, OrgContextGuard, CaslAbilityFactory, PermissionsGuard],
})
export class AuthFoundationModule {}
