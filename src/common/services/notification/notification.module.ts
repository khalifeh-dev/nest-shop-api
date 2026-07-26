import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { UserModule } from '../../../modules/user/user.module';

@Module({
  imports: [UserModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
