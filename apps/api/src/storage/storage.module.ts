import { Module } from '@nestjs/common';
import { IObjectStorage, S3ObjectStorage } from '@ag2/storage';
import { AppEnv } from '@ag2/config';
import { APP_ENV } from '../config';
import { OBJECT_STORAGE } from './object-storage.token';

@Module({
  providers: [
    {
      provide: OBJECT_STORAGE,
      useFactory: (env: AppEnv): IObjectStorage =>
        new S3ObjectStorage({
          bucket: env.S3_BUCKET,
          region: env.S3_REGION,
          endpoint: env.S3_ENDPOINT,
          publicEndpoint: env.S3_PUBLIC_ENDPOINT,
          forcePathStyle: env.S3_FORCE_PATH_STYLE,
          accessKeyId: env.S3_ACCESS_KEY_ID,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        }),
      inject: [APP_ENV],
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
