import { forwardRef, Module } from '@nestjs/common';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshTokenController } from './refresh-token.controller';
import { EncryptionModule } from '../../common/services/encryption/encryption.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    EncryptionModule,
    forwardRef(() => UserModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_REFRESH_SECRET_KEY'),
        signOptions: {
          expiresIn: configService.get('JWT_REFRESH_EXPIRATION') || '7d',
        },
      }),
    }),
  ],
  controllers: [RefreshTokenController],
  providers: [RefreshTokenService],
  exports: [RefreshTokenService],
})
export class RefreshTokenModule {}
