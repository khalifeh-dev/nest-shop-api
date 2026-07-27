import { Processor, Process } from '@nestjs/bull';
import { type Job } from 'bull';
import { DatabaseService } from '../../../database/database.service';
import { NotificationService } from '../notification.service';
import { NotificationStatus } from '@prisma/client';

@Processor('notification-queue')
export class NotificationProcessor {
  constructor(
    private prisma: DatabaseService,
    private notificationService: NotificationService,
  ) {}

  @Process('send-notification')
  public async handleSendNotification(job: Job) {
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
  public async handleBroadcastBatch(job: Job) {
    const { notificationId, userIds, batchNumber, totalBatches } = job.data;

    try {
      const userNotifications =
        await this.prisma.master.userNotification.findMany({
          where: {
            notificationId: notificationId,
            userId: { in: userIds },
          },
          select: {
            userId: true,
            deliveredAt: true,
          },
        });

      const existingUserIds = userNotifications.map((un) => un.userId);
      const missingUserIds = userIds.filter(
        (id: string) => !existingUserIds.includes(id),
      );
      if (missingUserIds.length > 0) {
        await this.prisma.master.userNotification.createMany({
          data: missingUserIds.map((userId: string) => ({
            userId,
            notificationId,
            deliveredAt: new Date(),
          })),
          skipDuplicates: true,
        });

        const updateResult =
          await this.prisma.master.userNotification.updateMany({
            where: {
              notificationId: notificationId,
              userId: { in: userIds },
            },
            data: {
              deliveredAt: new Date(),
            },
          });

        return {
          success: true,
          batchNumber,
          totalBatches,
          updatedCount: updateResult.count,
          createdCount: missingUserIds.length,
        };
      }
    } catch (error) {
      throw error;
    }
  }

  @Process('send-scheduled-notification')
  public async handleScheduledNotification(job: Job) {
    const {
      notificationId,
      userId,
      isBroadcast,
      targetAudience,
      scheduledFor,
    } = job.data;

    try {
      const notification =
        await this.notificationService.findOneNotification(notificationId);

      if (
        !notification ||
        notification.status === NotificationStatus.CANCELLED
      ) {
        return { skipped: true, reason: 'cancelled' };
      }

      if (isBroadcast) {
        await this.notificationService.sendBroadcast(notificationId, {
          targetAudience: targetAudience,
        });
      } else if (userId) {
        await this.notificationService.sendNotification(notificationId, userId);
      } else {
        return { skipped: true, reason: 'no_recipients' };
      }

      await this.prisma.master.notification.update({
        where: { id: notificationId },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        },
      });
      return { success: true, notificationId };
    } catch (error) {
      throw error;
    }
  }
}
