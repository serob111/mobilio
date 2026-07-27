import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditLogService } from '../../audit/application/audit-log.service';
import { generateApiKey } from '../infrastructure/api-key-generator.util';
import { hashToken } from '../infrastructure/token-hasher.util';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RequestContext } from './request-context';

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  list(organizationId: string) {
    return this.prisma.client.apiKey.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    organizationId: string,
    dto: CreateApiKeyDto,
    actorUserId: string,
    context: RequestContext,
  ): Promise<{ id: string; plainTextKey: string; keyPrefix: string }> {
    const generated = generateApiKey();

    const apiKey = await this.prisma.client.apiKey.create({
      data: {
        organizationId,
        createdByUserId: actorUserId,
        name: dto.name,
        keyPrefix: generated.prefix,
        keyHash: hashToken(generated.plainText),
        scopes: dto.scopes,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });

    await this.auditLog.record({
      organizationId,
      actorUserId,
      action: 'api_key.created',
      targetType: 'ApiKey',
      targetId: apiKey.id,
      metadata: { name: dto.name, scopes: dto.scopes },
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });

    return { id: apiKey.id, plainTextKey: generated.plainText, keyPrefix: generated.prefix };
  }

  async revoke(
    organizationId: string,
    apiKeyId: string,
    actorUserId: string,
    context: RequestContext,
  ): Promise<void> {
    const apiKey = await this.prisma.client.apiKey.findFirst({
      where: { id: apiKeyId, organizationId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.client.apiKey.update({
      where: { id: apiKeyId },
      data: { revokedAt: new Date() },
    });

    await this.auditLog.record({
      organizationId,
      actorUserId,
      action: 'api_key.revoked',
      targetType: 'ApiKey',
      targetId: apiKeyId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });
  }
}
