import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { CSRF_TOKEN_COOKIE, CSRF_TOKEN_HEADER } from './cookie-names';

/**
 * Double-submit cookie CSRF check for the handful of endpoints that rely on
 * the httpOnly refresh-token cookie (/auth/refresh, /auth/logout). Every
 * other endpoint authenticates with a Bearer access token, which is not
 * vulnerable to CSRF, so this guard is applied narrowly rather than
 * globally.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const cookieToken = request.cookies?.[CSRF_TOKEN_COOKIE];
    const headerToken = request.headers[CSRF_TOKEN_HEADER];

    if (
      typeof cookieToken !== 'string' ||
      typeof headerToken !== 'string' ||
      !this.tokensMatch(cookieToken, headerToken)
    ) {
      throw new ForbiddenException('Missing or invalid CSRF token');
    }

    return true;
  }

  private tokensMatch(a: string, b: string): boolean {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    if (bufferA.length !== bufferB.length) {
      return false;
    }

    return timingSafeEqual(bufferA, bufferB);
  }
}
