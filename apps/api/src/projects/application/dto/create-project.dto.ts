import { IsEnum, IsString, IsUrl, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { ProjectSourceType } from '@ag2/contracts';

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsEnum(ProjectSourceType)
  sourceType!: ProjectSourceType;

  @ValidateIf((dto: CreateProjectDto) => dto.sourceType === ProjectSourceType.URL)
  @IsUrl({ require_protocol: true })
  sourceUrl?: string;
}
