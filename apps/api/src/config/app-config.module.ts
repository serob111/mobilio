import { Global, Module } from '@nestjs/common';
import { AppEnv, loadEnv } from '@ag2/config';
import { APP_ENV } from './app-env.token';

@Global()
@Module({
  providers: [
    {
      provide: APP_ENV,
      useFactory: (): AppEnv => loadEnv(process.env),
    },
  ],
  exports: [APP_ENV],
})
export class AppConfigModule {}
