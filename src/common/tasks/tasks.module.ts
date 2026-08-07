import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { RefreshTokenModule } from '../services/refresh-token/refresh-token.module';
import { CleanUpJob } from './jobs/clean-up.job';
import { VerifyCodeModule } from '../services/verify-code/verify-code.module';
import { NotificationModule } from '../services/notification/notification.module';
import { ProductModule } from '../../modules/product/product.module';

@Module({
  imports: [RefreshTokenModule, VerifyCodeModule, NotificationModule, ProductModule],
  providers: [TasksService, CleanUpJob], 
})
export class TasksModule {}
