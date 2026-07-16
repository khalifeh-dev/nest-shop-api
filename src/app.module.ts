import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './common/database/database.module';
import { EncryptionModule } from './common/services/encryption/encryption.module';
import { UserModule } from './modules/user/user.module';
import { CloudinaryModule } from './common/services/cloudinary/cloudinary.module';
import { AuthModule } from './modules/auth/auth.module';
import { RefreshTokenModule } from './modules/refresh-token/refresh-token.module';
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler"
import { Redis } from "ioredis"
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis"
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [

    // External Modules
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    ThrottlerModule.forRoot({
      storage: new ThrottlerStorageRedisService(
        new Redis({
          host: 'localhost',
          port: 6379,
        }),
      ),
      throttlers: [
        {
          name: 'default',
          ttl: 60_000,
          limit: 60,
        },
        {
          name: 'auth',
          ttl: 60_000, 
          limit: 10,
        },
      ],
    }),

    // Modules
    DatabaseModule,
    EncryptionModule,
    UserModule,
    CloudinaryModule,
    AuthModule,
    RefreshTokenModule,

  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
