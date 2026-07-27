import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { UserModule } from '../../../modules/user/user.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    UserModule,
    BullModule.registerQueue({
      name: 'email-queue',
    }),
  ],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
