import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from "cookie-parser"
import { SwaggerModule } from "@nestjs/swagger"
import { AppModule } from './app.module';
import swaggerConfig from "./configs/swagger.config.js"

(async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService)

  app.use(cookieParser())

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
    prefix: "api/v"
  })
  
  app.enableCors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5500",
    ],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTION"],
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
    ],
    exposedHeaders: ["X-Total-Count"],
    maxAge: 3600
  })

  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup("/api/v1/docs", app, document)

  const appPort = configService.get("APP_PORT", 9001)

  await app.listen(appPort, () => {
    console.log(`🚀 Application Is Running On: http://localhost:${ appPort }/api/v1`)
    console.log(`📄 Application Documentation On http://localhost:${ appPort }/api/v1/docs`)
  });
})()
