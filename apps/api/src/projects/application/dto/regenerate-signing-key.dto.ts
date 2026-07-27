import { IsBoolean } from 'class-validator';

export class RegenerateSigningKeyDto {
  @IsBoolean()
  confirm!: boolean;
}
