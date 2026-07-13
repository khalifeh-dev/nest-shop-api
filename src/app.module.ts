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

@Module({
  imports: [

    // External Modules
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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
  providers: [AppService],
})
export class AppModule {}
