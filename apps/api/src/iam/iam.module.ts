import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { AuthService } from './application/auth.service';
import { OrganizationsService } from './application/organizations.service';
import { TeamsService } from './application/teams.service';
import { MembershipsService } from './application/memberships.service';
import { ApiKeysService } from './application/api-keys.service';
import { PasswordHasherService } from './infrastructure/password-hasher.service';
import { AuthController } from './presentation/auth.controller';
import { OrganizationsController } from './presentation/organizations.controller';
import { TeamsController } from './presentation/teams.controller';
import { MembershipsController } from './presentation/memberships.controller';
import { ApiKeysController } from './presentation/api-keys.controller';

@Module({
  imports: [NotificationsModule, AuditModule],
  controllers: [
    AuthController,
    OrganizationsController,
    TeamsController,
    MembershipsController,
    ApiKeysController,
  ],
  providers: [
    AuthService,
    OrganizationsService,
    TeamsService,
    MembershipsService,
    ApiKeysService,
    PasswordHasherService,
  ],
})
export class IamModule {}
