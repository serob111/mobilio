import { IsIn } from 'class-validator';

// PNG only: Android's adaptive-icon/splash tooling expects PNG, and fixing
// the format lets the storage key (and its extension) stay deterministic
// instead of round-tripping a client-supplied key between request/confirm.
const SUPPORTED_ASSET_CONTENT_TYPES = ['image/png'] as const;

export class RequestAssetUploadDto {
  @IsIn(SUPPORTED_ASSET_CONTENT_TYPES)
  contentType!: (typeof SUPPORTED_ASSET_CONTENT_TYPES)[number];
}
