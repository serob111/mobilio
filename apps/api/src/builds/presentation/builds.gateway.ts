import { Inject, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Redis } from 'ioredis';
import { Action, BuildStatusMessage } from '@ag2/contracts';
import { loadEnv } from '@ag2/config';
import { Build } from '@ag2/database';
import { REDIS_CLIENT } from '../../common/redis/redis-client.token';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TokenService } from '../../common/auth/token.service';
import { CaslAbilityFactory } from '../../common/auth/casl-ability.factory';
import { toContractsOrgRole } from '../../common/auth/org-role.mapper';
import { toContractsJobStatus } from '../application/build-enum.mapper';

// Read once at module-load time: @WebSocketGateway's CORS option is static
// decorator metadata, evaluated before Nest's DI container exists, so it
// can't come from an injected AppEnv the way the HTTP CORS config does.
const corsOrigins = loadEnv(process.env).CORS_ALLOWED_ORIGINS;

interface SocketData {
  userId: string;
}

/**
 * The build-worker never talks to the API directly — it only publishes to
 * Redis. This gateway is the one place that turns those pub/sub messages
 * into a WebSocket fan-out, so the worker stays entirely decoupled from
 * how (or whether) anyone is watching a given build live.
 */
@WebSocketGateway({
  namespace: '/builds',
  cors: { origin: corsOrigins, credentials: true },
})
export class BuildsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(BuildsGateway.name);
  private subscriber?: Redis;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
    private readonly abilityFactory: CaslAbilityFactory,
  ) {}

  onModuleInit(): void {
    this.subscriber = this.redis.duplicate();
    void this.subscriber.psubscribe('build-logs:*', 'build-status:*');

    this.subscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
      const separatorIndex = channel.indexOf(':');
      const kind = channel.slice(0, separatorIndex);
      const buildId = channel.slice(separatorIndex + 1);
      const event = kind === 'build-logs' ? 'log' : 'status';

      this.server.to(this.room(buildId)).emit(event, JSON.parse(message));
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.subscriber?.quit();
  }

  handleConnection(client: Socket): void {
    const token = this.extractToken(client);

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const claims = this.tokens.verifyAccessToken(token);
      (client.data as SocketData).userId = claims.sub;
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(): void {
    // Socket.IO cleans up room membership automatically on disconnect.
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(client: Socket, payload: { buildId?: string }): Promise<void> {
    const userId = (client.data as SocketData).userId;
    const buildId = payload?.buildId;

    if (!userId || !buildId) {
      return;
    }

    const build = await this.findReadableBuild(userId, buildId);
    if (!build) {
      this.logger.warn(`User ${userId} denied subscription to build ${buildId}`);
      return;
    }

    await client.join(this.room(buildId));

    // Redis pub/sub has no replay buffer — a build that transitions (or
    // even finishes) between "trigger" and this subscribe landing would
    // otherwise leave the client stuck on stale state forever. Catch it up
    // with a direct snapshot instead of waiting on a future pmessage.
    const snapshot: BuildStatusMessage = {
      status: toContractsJobStatus(build.status),
      errorMessage: build.errorMessage ?? undefined,
    };
    client.emit('status', snapshot);
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(client: Socket, payload: { buildId?: string }): Promise<void> {
    if (payload?.buildId) {
      await client.leave(this.room(payload.buildId));
    }
  }

  private async findReadableBuild(userId: string, buildId: string): Promise<Build | null> {
    const build = await this.prisma.client.build.findUnique({ where: { id: buildId } });
    if (!build) {
      return null;
    }

    const membership = await this.prisma.client.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: build.organizationId } },
    });
    if (!membership) {
      return null;
    }

    const ability = this.abilityFactory.createForRole(toContractsOrgRole(membership.role));
    return ability.can(Action.READ, 'Project') ? build : null;
  }

  private room(buildId: string): string {
    return `build:${buildId}`;
  }

  private extractToken(client: Socket): string | undefined {
    const fromAuth = client.handshake.auth?.['token'];
    if (typeof fromAuth === 'string') {
      return fromAuth;
    }
    const fromQuery = client.handshake.query?.['token'];
    return typeof fromQuery === 'string' ? fromQuery : undefined;
  }
}
