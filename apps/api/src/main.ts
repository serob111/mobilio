import './observability/tracing/otel-bootstrap';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { loadEnv } from '@ag2/config';
import { initSentry } from '@ag2/observability';
import { AppModule } from './app.module';
import { configureSecurity } from './common/security/security.setup';

async function bootstrap(): Promise<void> {
  const env = loadEnv(process.env);
  initSentry(env, 'ag2-api');

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  configureSecurity(app, env);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api', {
    exclude: ['health/live', 'health/ready', 'metrics'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ag2 API')
    .setDescription('Mobile App Builder platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  app.enableShutdownHooks();

  await app.listen(env.PORT);
  app.get(Logger).log(`ag2 API listening on port ${env.PORT}`, 'Bootstrap');
}

bootstrap();
