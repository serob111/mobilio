import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AndroidPermission, ScreenOrientation, StatusBarStyle } from '@ag2/contracts';

// Each dot-segment starts with a letter, then letters/digits/underscores —
// the same shape `aapt`/Gradle enforce for an Android applicationId.
const PACKAGE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

export class UpdateProjectConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  appName?: string;

  @IsOptional()
  @IsString()
  @Matches(PACKAGE_NAME_PATTERN, {
    message: 'packageName must look like a reverse-domain Android application id, e.g. com.company.app',
  })
  packageName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  versionName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  versionCode?: number;

  @IsOptional()
  @IsHexColor()
  themeColor?: string;

  @IsOptional()
  @IsEnum(ScreenOrientation)
  orientation?: ScreenOrientation;

  @IsOptional()
  @IsEnum(StatusBarStyle)
  statusBarStyle?: StatusBarStyle;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Matches(/^[a-z0-9.-]+$/, { each: true })
  allowedNavigationDomains?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z][a-z0-9+.-]*$/, { message: 'deepLinkScheme must be a valid URI scheme, e.g. myapp' })
  deepLinkScheme?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  customUserAgent?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsEnum(AndroidPermission, { each: true })
  permissions?: AndroidPermission[];
}
