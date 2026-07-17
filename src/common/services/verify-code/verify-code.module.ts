import { Module } from '@nestjs/common';
import { VerifyCodeService } from './verify-code.service';
import { UserModule } from '../../../modules/user/user.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { RefreshTokenModule } from '../../../modules/refresh-token/refresh-token.module';

@Module({
  imports: [UserModule, EncryptionModule, UserModule, RefreshTokenModule],
  providers: [VerifyCodeService],
  exports: [VerifyCodeService],
})
export class VerifyCodeModule {}
