import { IsEnum } from 'class-validator';
import { OrgRole } from '@ag2/contracts';

export class UpdateMembershipRoleDto {
  @IsEnum(OrgRole)
  role!: OrgRole;
}
