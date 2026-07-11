import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './common/database/database.module';
import { EncryptionModule } from './common/services/encryption/encryption.module';
import { UserModule } from './modules/user/user.module';
import { CloudinaryModule } from './common/services/cloudinary/cloudinary.module';

@Module({
  imports: [

    // External Modules
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    DatabaseModule,
    EncryptionModule,
    UserModule,
    CloudinaryModule,

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
