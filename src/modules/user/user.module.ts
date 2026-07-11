import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { EncryptionModule } from '../../common/services/encryption/encryption.module';
import { CloudinaryModule } from '../../common/services/cloudinary/cloudinary.module';

@Module({
  imports: [EncryptionModule, CloudinaryModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService]
})
export class UserModule {}
