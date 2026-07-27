import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { AppEnv } from '@ag2/config';
import { APP_ENV } from '../../config';

export interface AccessTokenClaims {
  sub: string;
  email: string;
}

interface SignedAccessTokenClaims extends AccessTokenClaims {
  jti: string;
}

export interface RefreshTokenClaims {
  sub: string;
  jti: string;
}

@Injectable()
export class TokenService {
  private readonly accessTokenJwt: JwtService;
  private readonly refreshTokenJwt: JwtService;
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;

  constructor(@Inject(APP_ENV) env: AppEnv) {
    this.accessTokenJwt = new JwtService({ secret: env.JWT_ACCESS_SECRET });
    this.refreshTokenJwt = new JwtService({ secret: env.JWT_REFRESH_SECRET });
    this.accessTtlSeconds = env.JWT_ACCESS_TTL_SECONDS;
    this.refreshTtlSeconds = env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60;
  }

  signAccessToken(claims: AccessTokenClaims): { token: string; expiresInSeconds: number } {
    const signedClaims: SignedAccessTokenClaims = { ...claims, jti: randomUUID() };
    const token = this.accessTokenJwt.sign(signedClaims, { expiresIn: this.accessTtlSeconds });
    return { token, expiresInSeconds: this.accessTtlSeconds };
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    return this.accessTokenJwt.verify<AccessTokenClaims>(token);
  }

  signRefreshToken(claims: RefreshTokenClaims): { token: string; expiresInSeconds: number } {
    const token = this.refreshTokenJwt.sign(claims, { expiresIn: this.refreshTtlSeconds });
    return { token, expiresInSeconds: this.refreshTtlSeconds };
  }

  verifyRefreshToken(token: string): RefreshTokenClaims {
    return this.refreshTokenJwt.verify<RefreshTokenClaims>(token);
  }

  get refreshTtlSecondsValue(): number {
    return this.refreshTtlSeconds;
  }
}
