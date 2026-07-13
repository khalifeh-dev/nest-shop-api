import { Module } from '@nestjs/common';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshTokenController } from './refresh-token.controller';
import { EncryptionModule } from '../../common/services/encryption/encryption.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [EncryptionModule, UserModule],
  controllers: [RefreshTokenController],
  providers: [RefreshTokenService],
})
export class RefreshTokenModule {}
