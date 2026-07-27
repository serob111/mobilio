import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { ProjectsService } from './application/projects.service';
import { ProjectConfigService } from './application/project-config.service';
import { SigningKeyService } from './application/signing-key.service';
import { KeystoreCryptoService } from './infrastructure/keystore-crypto.service';
import { ProjectsController } from './presentation/projects.controller';
import { ProjectConfigController } from './presentation/project-config.controller';
import { SigningKeyController } from './presentation/signing-key.controller';

@Module({
  imports: [AuditModule, StorageModule],
  controllers: [ProjectsController, ProjectConfigController, SigningKeyController],
  providers: [ProjectsService, ProjectConfigService, SigningKeyService, KeystoreCryptoService],
})
export class ProjectsModule {}
