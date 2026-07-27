import { Injectable } from '@nestjs/common';
import { Prisma } from '@ag2/database';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface RecordAuditLogInput {
  readonly organizationId: string;
  readonly actorUserId?: string;
  readonly action: string;
  readonly targetType: string;
  readonly targetId?: string;
  readonly metadata?: Record<string, unknown>;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

export interface AuditLogPage {
  readonly items: Array<{
    id: string;
    action: string;
    targetType: string;
    targetId: string | null;
    actorUserId: string | null;
    metadata: unknown;
    createdAt: Date;
  }>;
  readonly total: number;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditLogInput): Promise<void> {
    await this.prisma.client.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  async list(organizationId: string, page: number, pageSize: number): Promise<AuditLogPage> {
    const [items, total] = await Promise.all([
      this.prisma.client.auditLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.client.auditLog.count({ where: { organizationId } }),
    ]);

    return { items, total };
  }
}
