import { ArrayMinSize, IsArray, IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiKeyScope } from '@ag2/contracts';

export class CreateApiKeyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(ApiKeyScope, { each: true })
  scopes!: ApiKeyScope[];

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
