import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { EncryptionModule } from '../../common/services/encryption/encryption.module';

@Module({
  imports: [EncryptionModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService]
})
export class UserModule {}
