import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { RefreshTokenModule } from '../../modules/refresh-token/refresh-token.module';
import { CleanUpJob } from './jobs/clean-up.job';

@Module({
  imports: [RefreshTokenModule],
  providers: [TasksService, CleanUpJob], 
})
export class TasksModule {}
