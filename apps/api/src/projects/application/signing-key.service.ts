import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { IObjectStorage } from '@ag2/storage';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditLogService } from '../../audit/application/audit-log.service';
import { OBJECT_STORAGE } from '../../storage/object-storage.token';
import { RequestContext } from '../../iam/application/request-context';
import { KeystoreCryptoService } from '../infrastructure/keystore-crypto.service';
import { generateKeystore } from '../infrastructure/keystore-generator.util';

const KEYSTORE_URL_TTL_SECONDS = 60;
// 24 random bytes -> 32 base64url characters: comfortably strong, and plain
// alphanumeric-ish output never needs shell/XML escaping wherever it's
// later referenced (Gradle signingConfig properties).
const PASSWORD_BYTES = 24;
const KEY_ALIAS = 'release';

export interface SigningKeySummary {
  readonly alias: string;
  readonly sha256Fingerprint: string;
  readonly createdAt: Date;
}

export interface SigningKeyBackup {
  readonly filename: string;
  readonly contentType: string;
  readonly body: Buffer;
}

@Injectable()
export class SigningKeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly crypto: KeystoreCryptoService,
    @Inject(OBJECT_STORAGE) private readonly objectStorage: IObjectStorage,
  ) {}

  /** Called once, right after a project is created — every project always has a signing identity from that point on, the same way it always has a ProjectConfig. */
  async createDefault(project: { id: string; organizationId: string; slug: string }): Promise<void> {
    await this.provision(project);
  }

  async getSummary(organizationId: string, projectId: string): Promise<SigningKeySummary> {
    await this.assertProjectExists(organizationId, projectId);
    const signingKey = await this.prisma.client.signingKey.findUnique({ where: { projectId } });
    if (!signingKey) {
      // Defensive only — createDefault() runs synchronously with project
      // creation, so every project should already have one of these.
      throw new NotFoundException('Signing key not found');
    }
    return signingKey;
  }

  async regenerate(
    organizationId: string,
    projectId: string,
    actorUserId: string,
    context: RequestContext,
  ): Promise<SigningKeySummary> {
    const project = await this.assertProjectExists(organizationId, projectId);
    const signingKey = await this.provision(project);

    await this.auditLog.record({
      organizationId,
      actorUserId,
      action: 'project.signing_key_regenerated',
      targetType: 'Project',
      targetId: projectId,
      metadata: { alias: signingKey.alias, sha256Fingerprint: signingKey.sha256Fingerprint },
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });

    return signingKey;
  }

  async getBackup(organizationId: string, projectId: string): Promise<SigningKeyBackup> {
    const project = await this.assertProjectExists(organizationId, projectId);
    const signingKey = await this.prisma.client.signingKey.findUnique({ where: { projectId } });
    if (!signingKey) {
      throw new NotFoundException('Signing key not found');
    }

    const url = await this.objectStorage.getSignedDownloadUrl(
      signingKey.keystoreStorageKey,
      KEYSTORE_URL_TTL_SECONDS,
    );
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to read stored keystore: HTTP ${response.status}`);
    }
    const encrypted = Buffer.from(await response.arrayBuffer());

    return {
      filename: `${project.slug}-release-keystore.p12`,
      contentType: 'application/x-pkcs12',
      body: this.crypto.decrypt(encrypted),
    };
  }

  private async provision(project: {
    id: string;
    organizationId: string;
    slug: string;
  }): Promise<SigningKeySummary> {
    const password = randomBytes(PASSWORD_BYTES).toString('base64url');
    const { pkcs12, sha256Fingerprint } = generateKeystore({
      alias: KEY_ALIAS,
      password,
      commonName: `${project.slug}.ag2apps.dev`,
    });

    const keystoreStorageKey = this.keystoreStorageKey(project.organizationId, project.id);
    const encrypted = this.crypto.encrypt(pkcs12);
    await this.objectStorage.putObject({
      key: keystoreStorageKey,
      body: encrypted,
      contentType: 'application/octet-stream',
      contentLength: encrypted.byteLength,
    });

    const passwordEncrypted = this.crypto.encryptString(password);

    return this.prisma.client.signingKey.upsert({
      where: { projectId: project.id },
      create: {
        projectId: project.id,
        alias: KEY_ALIAS,
        keystoreStorageKey,
        storePasswordEncrypted: passwordEncrypted,
        keyPasswordEncrypted: passwordEncrypted,
        sha256Fingerprint,
      },
      update: {
        alias: KEY_ALIAS,
        keystoreStorageKey,
        storePasswordEncrypted: passwordEncrypted,
        keyPasswordEncrypted: passwordEncrypted,
        sha256Fingerprint,
      },
    });
  }

  private keystoreStorageKey(organizationId: string, projectId: string): string {
    return `projects/${organizationId}/${projectId}/signing/keystore.p12.enc`;
  }

  private async assertProjectExists(
    organizationId: string,
    projectId: string,
  ): Promise<{ id: string; organizationId: string; slug: string }> {
    const project = await this.prisma.client.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true, organizationId: true, slug: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }
}
