import { SetMetadata } from '@nestjs/common';
import { Action, RbacSubject } from '@ag2/contracts';

export const PERMISSION_KEY = 'ag2:required_permission';

export interface RequiredPermission {
  action: Action;
  subject: RbacSubject;
}

export const RequirePermission = (action: Action, subject: RbacSubject): MethodDecorator =>
  SetMetadata(PERMISSION_KEY, { action, subject } satisfies RequiredPermission);
