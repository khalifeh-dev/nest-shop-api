import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { EncryptionModule } from '../../common/services/encryption/encryption.module';
import { CloudinaryModule } from '../../common/services/cloudinary/cloudinary.module';
import { RefreshTokenModule } from '../refresh-token/refresh-token.module';

@Module({
  imports: [EncryptionModule, forwardRef(() => RefreshTokenModule), CloudinaryModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService]
})
export class UserModule {}
