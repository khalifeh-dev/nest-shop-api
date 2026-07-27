import { Processor, Process } from '@nestjs/bull';
import { type Job } from 'bull';
import { DatabaseService } from '../../../database/database.service';

@Processor('notification-queue')
export class NotificationProcessor {
  constructor(private prisma: DatabaseService) {}

  @Process('send-notification')
  async handleSendNotification(job: Job) {
    const { notificationId, userId } = job.data;

    try {
      await this.prisma.master.userNotification.updateMany({
        where: {
          userId: userId,
          notificationId: notificationId,
        },
        data: {
          deliveredAt: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      throw error;
    }
  }
}
