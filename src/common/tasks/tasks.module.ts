import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { RefreshTokenModule } from '../../modules/refresh-token/refresh-token.module';
import { CleanUpJob } from './jobs/clean-up.job';
import { VerifyCodeModule } from '../services/verify-code/verify-code.module';
import { NotificationModule } from '../services/notification/notification.module';

@Module({
  imports: [RefreshTokenModule, VerifyCodeModule, NotificationModule],
  providers: [TasksService, CleanUpJob], 
})
export class TasksModule {}
