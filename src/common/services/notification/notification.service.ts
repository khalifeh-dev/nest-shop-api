import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { UserService } from '../../../modules/user/user.service';
import { CreateNotificationDto } from './dto';
import { ConfigService } from '@nestjs/config';
import {
  NotificationPriority,
  NotificationStatus,
  NotificationType,
  Roles,
  UserStatus,
} from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import { type Queue } from 'bull';
import { NotificationOptions } from '../../types/notification.type';

@Injectable()
export class NotificationService {
  private _read;
  private _write;
  private readonly BATCH_SIZE = 1000;

  constructor(
    private prisma: DatabaseService,
    private userService: UserService,
    private configService: ConfigService,
    @InjectQueue('notification-queue') private notificationQueue: Queue,
  ) {
    this._read = this.prisma.replica;
    this._write = this.prisma.master;
  }

  public async create(dto: CreateNotificationDto) {
    try {
      if (dto?.userId) {
        await this.userService.secureFindOne(dto?.userId);
      }

      //! Check Has Order With dto.OrderId
      //! Check Has Product With dto.ProductId

      if (dto.scheduledFor) {
        const scheduledDate = new Date(dto.scheduledFor);
        if (scheduledDate < new Date()) {
          throw new BadRequestException('The schedule cannot be in the past.');
        }
      }

      //   let status = dto.status || NotificationStatus.DRAFT;
      let status = dto.status || NotificationStatus.PENDING;

      if (dto.scheduledFor) {
        // status = NotificationStatus.SCHEDULED;
        status = NotificationStatus.PENDING;
      }

      let totalRecipients: number | null = null;
      if (dto.isBroadcast) {
        totalRecipients = await this.getTotalRecipients(dto.targetAudience);
      }

      const notification = await this._write.notification.create({
        data: {
          title: dto.title,
          message: dto.message,
          content: dto.content || {},
          type: dto.type,
          priority: dto.priority || NotificationPriority.MEDIUM,
          status: status,
          userId: dto.userId || null,
          orderId: dto.orderId || null,
          productId: dto.productId || null,
          isBroadcast: dto.isBroadcast || false,
          targetAudience: dto.targetAudience || null,
          scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
          icon: dto.icon || null,
          link: dto.link || null,
          totalRecipients: totalRecipients,
          ...(status === NotificationStatus.SENT && {
            sentAt: new Date(),
          }),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (status === NotificationStatus.SENT) {
        await this.queueNotificationForSending(notification.id);
      }

      if (dto.userId && !dto.isBroadcast) {
        await this._write.userNotification.create({
          data: {
            userId: dto.userId,
            notificationId: notification.id,
            deliveredAt: new Date(),
          },
        });
      }

      return notification;
    } catch (error) {
      if (error instanceof NotFoundException) return error;
      if (error instanceof BadRequestException) return error;
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  public async sendNotification(notificationId: string, userId: string) {
    try {
      await this.userService.secureFindOne(userId);
      const notification = await this.findOneNotification(notificationId);

      if (notification.isBroadcast)
        throw new BadRequestException(
          'This is a broadcast notification; use the (sendBroadcast) method.',
        );
      if (notification.userId && notification.userId !== userId)
        throw new BadRequestException(
          'This notification was created for another user.',
        );
      if (notification.status === NotificationStatus.SENT)
        throw new BadRequestException(
          'This notification has already been sent.',
        );
      if (notification.status === NotificationStatus.CANCELLED)
        throw new BadRequestException('This notification has been cancelled.');

      await this._write.notification.update({
        where: { id: notificationId },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          ...(notification.userId === null && { userId: userId }),
        },
      });

      await this.prisma.master.userNotification.create({
        data: {
          userId: userId,
          notificationId: notificationId,
          deliveredAt: new Date(),
        },
      });

      await this.notificationQueue.add(
        'send-notification',
        {
          notificationId: notificationId,
          userId: userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.content,
          link: notification.link,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      return {
        success: true,
        message:
          'The notification was successfully added to the sending queue.',
      };
    } catch (error) {
      if (error instanceof NotFoundException) return error;
      if (error instanceof BadRequestException) return error;
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  public async findOneNotification(notificationId: string) {
    try {
      const notification = await this._read.notification.findUnique({
        where: { id: notificationId },
        include: { user: true },
      });

      if (!notification)
        throw new NotFoundException(
          `Notification Not Found With ID ${notificationId} .`,
        );

      return notification;
    } catch (error) {
      if (error instanceof NotFoundException) return error;
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  public async sendBroadcast(
    notificationId: string,
    options?: NotificationOptions,
  ) {
    try {
      const notification = await this.findOneNotification(notificationId);

      if (!notification.isBroadcast)
        throw new BadRequestException(
          'This is a simple notification; use the (sendNotification) method.',
        );
      if (notification.status === NotificationStatus.SENT)
        throw new BadRequestException('This notification has been sent.');

      const targetAudience =
        options?.targetAudience || notification.targetAudience || 'ALL';
      const customUserIds = options?.customUserIds || [];
      const batchSize = options?.batchSize || this.BATCH_SIZE;

      const userIds = await this.getTargetUserIds(
        targetAudience,
        customUserIds,
      );

      if (userIds.length === 0)
        throw new BadRequestException('There are no users to send to.');

      await this._write.notification.update({
        where: { id: notificationId },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          totalRecipients: userIds.length,
        },
      });

      const userNotificationData = userIds.map((userId) => ({
        userId,
        notificationId,
        deliveredAt: new Date(),
      }));

      await this._write.userNotification.createMany({
        data: userNotificationData,
        skipDuplicates: true,
      });

      const batches = this.chunkArray(userIds, batchSize);

      for (const [index, batch] of batches.entries()) {
        await this.notificationQueue.add(
          'send-broadcast-batch',
          {
            notificationId: notificationId,
            userIds: batch,
            batchNumber: index + 1,
            totalBatches: batches.length,
            title: notification.title,
            message: notification.message,
            data: notification.content,
            link: notification.link,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
            removeOnComplete: true,
            removeOnFail: false,
            priority: 10,
          },
        );
      }

      return {
        success: true,
        message: `Broadcast notification successfully added to the queue (${userIds.length} users)`,
        totalRecipients: userIds.length,
      };
    } catch (error) {
      if (error instanceof NotFoundException) return error;
      if (error instanceof BadRequestException) return error;
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  public async scheduleNotification(
    notificationId: string,
    scheduledFor: Date | string,
  ) {
    try {
      const scheduledDate =
        typeof scheduledFor === 'string'
          ? new Date(scheduledFor)
          : scheduledFor;

      if (isNaN(scheduledDate.getTime()))
        throw new BadRequestException('The entered date format is invalid.');

      const notification = await this.findOneNotification(notificationId);

      const minDelay = 900_000; // 15 Minute
      const now = new Date();

      if (scheduledDate.getTime() - now.getTime() < minDelay) {
        throw new BadRequestException(
          `The scheduled time must be at least ${minDelay / 60000} minutes in the future.`,
        );
      }

      if (notification.status === NotificationStatus.SENT) {
        throw new BadRequestException(
          'This notification has already been sent.',
        );
      }

      if (notification.status === NotificationStatus.CANCELLED) {
        throw new BadRequestException('This notification has been cancelled.');
      }

      await this._write.notification.update({
        where: { id: notificationId },
        data: {
          status: NotificationStatus.SCHEDULED,
          scheduledFor: scheduledDate,
        },
      });

      const delay = scheduledDate.getTime() - Date.now();

      const job = await this.notificationQueue.add(
        'send-scheduled-notification',
        {
          notificationId: notificationId,
          userId: notification.userId,
          isBroadcast: notification.isBroadcast,
          targetAudience: notification.targetAudience,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.content,
          link: notification.link,
          scheduledFor: scheduledDate.toISOString(),
        },
        {
          delay: delay,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false,
          priority: 5,
        },
      );

      return {
        success: true,
        message: `Notification successfully scheduled for ${scheduledDate.toLocaleString('fa-IR')}`,
        scheduledFor: scheduledDate,
        jobId: job.id,
      };
    } catch (error) {
      if (error instanceof NotFoundException) return error;
      if (error instanceof BadRequestException) return error;
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  public async dismissNotification(userId: string, notificationId: string) {
    try {
      await this.userService.secureFindOne(userId);

      const userNotification =
        await this.prisma.replica.userNotification.findFirst({
          where: {
            userId,
            notificationId,
            isDismissed: false,
          },
        });

      if (!userNotification) {
        throw new NotFoundException(
          'Notification not found or already dismissed',
        );
      }

      await this.prisma.master.userNotification.update({
        where: { id: userNotification.id },
        data: {
          isDismissed: true,
          dismissedAt: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) return error;
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  public async dismissAllNotifications(userId: string) {
    try {
      await this.userService.secureFindOne(userId);

      const result = await this.prisma.master.userNotification.updateMany({
        where: {
          userId,
          isDismissed: false,
        },
        data: {
          isDismissed: true,
          dismissedAt: new Date(),
        },
      });

      return {
        count: result.count,
        message: `${result.count} notifications dismissed`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) return error;
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  public async dismissOldNotifications(userId: string, days: number = 30) {
    try {
      await this.userService.secureFindOne(userId);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await this.prisma.master.userNotification.updateMany({
        where: {
          userId,
          isDismissed: false,
          deliveredAt: { lt: cutoffDate },
        },
        data: {
          isDismissed: true,
          dismissedAt: new Date(),
        },
      });

      return {
        count: result.count,
        message: `${result.count} old notifications dismissed`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) return error;
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  public async undismissNotification(userId: string, notificationId: string) {
    try {
      await this.userService.secureFindOne(userId);
      const userNotification =
        await this.prisma.replica.userNotification.findFirst({
          where: {
            userId,
            notificationId,
            isDismissed: true,
          },
        });

      if (!userNotification) {
        throw new NotFoundException('Notification not found or not dismissed');
      }

      await this.prisma.master.userNotification.update({
        where: { id: userNotification.id },
        data: {
          isDismissed: false,
          dismissedAt: null,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) return error;
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  public async markAsRead(userId: string, notificationId: string) {
    try {
      await this.userService.secureFindOne(userId);

      const userNotification =
        await this.prisma.master.userNotification.findFirst({
          where: {
            userId,
            notificationId,
            isRead: false,
          },
        });

      if (!userNotification) {
        throw new NotFoundException(
          'Notification not found or already marked as read',
        );
      }

      await this.prisma.master.userNotification.update({
        where: { id: userNotification.id },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return {
        message: 'Notification marked as read successfully',
        notificationId,
        readAt: new Date(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  public async markAllAsRead(userId: string) {
    try {
      await this.userService.secureFindOne(userId);

      const result = await this.prisma.master.userNotification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return {
        message: result.count === 0 
          ? 'No unread notifications found' 
          : `${result.count} notifications marked as read`,
        count: result.count,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  private async getTotalRecipients(targetAudience?: string): Promise<number> {
    const where: any = { isDeleted: false };

    if (targetAudience === 'ACTIVE_USERS') {
      where.lastLoginAt = {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      };
    } else if (targetAudience === 'INACTIVE_USERS') {
      where.lastLoginAt = {
        lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      };
    } else if (targetAudience === 'ADMINS') {
      where.roles = { has: 'ADMIN' };
    }

    return await this._read.user.count({ where });
  }

  private async queueNotificationForSending(notificationId: string) {}

  private async getTargetUserIds(
    targetAudience: 'ALL' | 'ACTIVE_USERS' | 'INACTIVE_USERS' | 'ADMINS',
    customUserIds: string[],
  ): Promise<string[]> {
    try {
      if (customUserIds.length > 0) return customUserIds;

      const where: any = {
        isDeleted: false,
        userStatus: UserStatus.ACTIVE,
      };

      if (targetAudience === 'ACTIVE_USERS') {
        where.lastLoginAt = {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        };
      } else if (targetAudience === 'INACTIVE_USERS') {
        where.lastLoginAt = {
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        };
      } else if (targetAudience === 'ADMINS') {
        where.role = { in: ['ADMIN', 'SUPER_ADMIN'] };
      }

      const users = await this._read.user.findMany({
        where,
        select: { id: true },
      });

      return users.map((user) => user.id);
    } catch (error) {
      throw error;
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
