import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CleanUpJob } from './jobs/clean-up.job';

@Injectable()
export class TasksService {
  constructor(private cleanUpJob: CleanUpJob) {}

  @Cron('0 0 1 * *')
  public async cleanRefreshTokens() {
    const result = await this.cleanUpJob.cleanUpRefreshTokens();
  }
}
