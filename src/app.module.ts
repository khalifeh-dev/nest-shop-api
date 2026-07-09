import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './common/database/database.module';
import { EncryptionModule } from './common/services/encryption/encryption.module';

@Module({
  imports: [

    // External Modules
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    DatabaseModule,

    EncryptionModule,

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
