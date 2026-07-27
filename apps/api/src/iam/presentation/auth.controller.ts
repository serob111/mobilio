import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { randomBytes } from 'node:crypto';
import { Throttle } from '@nestjs/throttler';
import { AppEnv, loadEnv } from '@ag2/config';
import { APP_ENV } from '../../config';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/auth/authenticated-request';
import { CsrfGuard } from '../../common/security/csrf.guard';
import { CSRF_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../../common/security/cookie-names';
import { csrfTokenCookieOptions, refreshTokenCookieOptions } from '../../common/security/cookie-options';
import { PrismaService } from '../../common/prisma/prisma.service';
import { requestContextFrom } from '../../common/utils/request-context.util';
import { AuthService } from '../application/auth.service';
import { AuthResult } from '../application/auth-result';
import { RegisterDto } from '../application/dto/register.dto';
import { LoginDto } from '../application/dto/login.dto';

// Read once at module-load time: @Throttle's limit is static decorator
// metadata, evaluated before Nest's DI container exists, so it can't come
// from an injected AppEnv the way the rest of this controller's config does.
const authThrottleLimits = loadEnv(process.env);

interface AuthResponseBody {
  user: { id: string; email: string; name: string };
  accessToken: string;
  accessTokenExpiresInSeconds: number;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  @Post('register')
  @Throttle({
    default: {
      limit: authThrottleLimits.AUTH_REGISTER_THROTTLE_LIMIT,
      ttl: 60_000,
      blockDuration: 15 * 60_000,
    },
  })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseBody> {
    const result = await this.authService.register(dto, requestContextFrom(req));
    this.applyAuthCookies(res, result);
    return this.toResponseBody(result);
  }

  @Post('login')
  @Throttle({
    default: {
      limit: authThrottleLimits.AUTH_LOGIN_THROTTLE_LIMIT,
      ttl: 60_000,
      blockDuration: 15 * 60_000,
    },
  })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseBody> {
    const result = await this.authService.login(dto, requestContextFrom(req));
    this.applyAuthCookies(res, result);
    return this.toResponseBody(result);
  }

  @Post('refresh')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseBody> {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (typeof refreshToken !== 'string') {
      throw new UnauthorizedException('Missing refresh token');
    }

    const result = await this.authService.refresh(refreshToken, requestContextFrom(req));
    this.applyAuthCookies(res, result);
    return this.toResponseBody(result);
  }

  @Post('logout')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (typeof refreshToken === 'string') {
      await this.authService.logout(refreshToken);
    }
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/api/auth' });
    res.clearCookie(CSRF_TOKEN_COOKIE, { path: '/' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: AuthenticatedRequest) {
    const user = await this.prisma.client.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { id: user.id, email: user.email, name: user.name };
  }

  private applyAuthCookies(res: Response, result: AuthResult): void {
    res.cookie(
      REFRESH_TOKEN_COOKIE,
      result.refreshToken,
      refreshTokenCookieOptions(this.env, result.refreshTokenExpiresInSeconds * 1000),
    );
    res.cookie(
      CSRF_TOKEN_COOKIE,
      randomBytes(32).toString('hex'),
      csrfTokenCookieOptions(this.env, result.refreshTokenExpiresInSeconds * 1000),
    );
  }

  private toResponseBody(result: AuthResult): AuthResponseBody {
    return {
      user: { id: result.userId, email: result.email, name: result.name },
      accessToken: result.accessToken,
      accessTokenExpiresInSeconds: result.accessTokenExpiresInSeconds,
    };
  }
}
