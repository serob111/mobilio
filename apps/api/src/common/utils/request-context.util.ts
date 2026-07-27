import { AuthenticatedRequest } from '../auth/authenticated-request';

export function requestContextFrom(req: AuthenticatedRequest): { ip?: string; userAgent?: string } {
  return { ip: req.ip, userAgent: req.headers['user-agent'] };
}
