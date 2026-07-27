import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Counter } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { OrgRole as PrismaOrgRole } from '@ag2/database';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TokenService } from '../../common/auth/token.service';
import { AuditLogService } from '../../audit/application/audit-log.service';
import { EmailQueueService } from '../../notifications/application/email-queue.service';
import { USERS_REGISTERED_TOTAL } from '../../observability/metrics/metric-names';
import { slugify } from '../../common/utils/slugify';
import { PasswordHasherService } from '../infrastructure/password-hasher.service';
import { hashToken } from '../infrastructure/token-hasher.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestContext } from './request-context';
import { AuthResult } from './auth-result';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly tokens: TokenService,
    private readonly emailQueue: EmailQueueService,
    private readonly auditLog: AuditLogService,
    @InjectMetric(USERS_REGISTERED_TOTAL) private readonly usersRegisteredCounter: Counter<string>,
  ) {}

  async register(dto: RegisterDto, context: RequestContext): Promise<AuthResult> {
    const existing = await this.prisma.client.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);

    const { user, organization } = await this.prisma.client.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: { email: dto.email, passwordHash, name: dto.name },
      });

      const orgName = `${dto.name}'s Organization`;
      const slug = await this.uniqueOrgSlug(orgName);
      const createdOrg = await tx.organization.create({ data: { name: orgName, slug } });

      await tx.membership.create({
        data: {
          userId: createdUser.id,
          organizationId: createdOrg.id,
          role: PrismaOrgRole.OWNER,
        },
      });

      return { user: createdUser, organization: createdOrg };
    });

    this.usersRegisteredCounter.inc();

    await this.emailQueue.enqueueWelcomeEmail({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    await this.auditLog.record({
      organizationId: organization.id,
      actorUserId: user.id,
      action: 'user.registered',
      targetType: 'User',
      targetId: user.id,
      ipAddress: context.ip,
      userAgent: context.userAgent,
    });

    return this.issueTokenPair(user.id, user.email, user.name, context);
  }

  async login(dto: LoginDto, context: RequestContext): Promise<AuthResult> {
    const user = await this.prisma.client.user.findUnique({ where: { email: dto.email } });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await this.passwordHasher.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueTokenPair(user.id, user.email, user.name, context);
  }

  async refresh(refreshToken: string, context: RequestContext): Promise<AuthResult> {
    try {
      this.tokens.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.client.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revokedAt) {
      await this.revokeFamily(stored.family);
      throw new UnauthorizedException('Refresh token has already been used');
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.prisma.client.user.findUnique({ where: { id: stored.userId } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const result = await this.issueTokenPair(user.id, user.email, user.name, context, {
      family: stored.family,
      replacesTokenRowId: stored.id,
    });

    return result;
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.client.refreshToken.findUnique({ where: { tokenHash } });

    if (stored && !stored.revokedAt) {
      await this.revokeFamily(stored.family);
    }
  }

  private async revokeFamily(family: string): Promise<void> {
    await this.prisma.client.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    name: string,
    context: RequestContext,
    rotation?: { family: string; replacesTokenRowId: string },
  ): Promise<AuthResult> {
    const access = this.tokens.signAccessToken({ sub: userId, email });
    const refresh = this.tokens.signRefreshToken({ sub: userId, jti: randomUUID() });
    const family = rotation?.family ?? randomUUID();

    const created = await this.prisma.client.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refresh.token),
        family,
        expiresAt: new Date(Date.now() + refresh.expiresInSeconds * 1000),
        createdByIp: context.ip,
        userAgent: context.userAgent,
      },
    });

    if (rotation) {
      await this.prisma.client.refreshToken.update({
        where: { id: rotation.replacesTokenRowId },
        data: { revokedAt: new Date(), replacedByTokenId: created.id },
      });
    }

    return {
      userId,
      email,
      name,
      accessToken: access.token,
      accessTokenExpiresInSeconds: access.expiresInSeconds,
      refreshToken: refresh.token,
      refreshTokenExpiresInSeconds: refresh.expiresInSeconds,
    };
  }

  private async uniqueOrgSlug(name: string): Promise<string> {
    const base = slugify(name) || 'org';
    let candidate = base;
    let suffix = 2;

    while (await this.prisma.client.organization.findUnique({ where: { slug: candidate } })) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}
