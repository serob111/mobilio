import { IsEmail, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { OrgRole } from '@ag2/contracts';

export class AddMembershipDto {
  @IsEmail()
  email!: string;

  @IsEnum(OrgRole)
  role!: OrgRole;

  @IsOptional()
  @IsUUID()
  teamId?: string;
}
