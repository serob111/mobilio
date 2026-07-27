import { Request } from 'express';
import { OrgRole } from '@ag2/contracts';

export interface AuthenticatedUser {
  readonly userId: string;
  readonly email: string;
}

export interface OrgMembershipContext {
  readonly organizationId: string;
  readonly role: OrgRole;
  readonly membershipId: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  membership?: OrgMembershipContext;
}
