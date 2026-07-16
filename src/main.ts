import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import swaggerConfig from './configs/swagger.config.js';
import { TransformInterceptor } from './common/interceptors/transform/transform.interceptor';
import { TransformFilter } from './common/filters/transform/transform.filter';
import { ThrottlerGuard } from '@nestjs/throttler';

(async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const throttlerGuard = app.get(ThrottlerGuard);

  app.useGlobalGuards(throttlerGuard);
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new TransformFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.use(cookieParser());

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5500',
    ],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 3600,
  });

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('/api/v1/docs', app, document);

  const appPort = configService.get<number>('APP_PORT', 9001);

  await app.listen(appPort, () => {
    console.log(
      `🚀 Application Is Running On: http://localhost:${appPort}/api/v1`,
    );
    console.log(
      `📄 Application Documentation On http://localhost:${appPort}/api/v1/docs`,
    );
  });
})();
