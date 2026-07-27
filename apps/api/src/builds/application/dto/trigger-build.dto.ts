import { IsEnum } from 'class-validator';
import { BuildArtifactType, BuildTargetPlatform } from '@ag2/contracts';

export class TriggerBuildDto {
  @IsEnum(BuildTargetPlatform)
  platform!: BuildTargetPlatform;

  @IsEnum(BuildArtifactType)
  artifactType!: BuildArtifactType;
}
