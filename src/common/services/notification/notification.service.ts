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
} from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import { type Queue } from 'bull';

@Injectable()
export class NotificationService {
  private _read;
  private _write;

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

  public async send(notificationId: string, userId: string) {
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
}
