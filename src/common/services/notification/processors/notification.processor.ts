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

  @Process('send-broadcast-batch')
  async handleBroadcastBatch(job: Job) {
    const { userIds } = job.data;

    try {
      const results = await Promise.allSettled(
        userIds.map(async (userId: string) => {
          try {
            return { userId, success: true };
          } catch (error: any) {
            return { userId, success: false, error: error?.message };
          }
        }),
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      return { success: true, successful, failed };
    } catch (error) {
      throw error;
    }
  }
}
