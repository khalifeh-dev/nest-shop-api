import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DatabaseService } from '../../common/database/database.service';
import { Prisma, User, UserImage } from '@prisma/client';
import { EncryptionService } from '../../common/services/encryption/encryption.service';
import { FindAll } from '../../common/types/find-all.type';
import { pick } from 'lodash';
import { SanitizeUser } from '../../common/types/user.type';
import { CloudinaryService } from '../../common/services/cloudinary/cloudinary.service';
import {
  AccountAction,
  UserActions,
  UserStatus,
} from '../../common/constants/user.constant';
import { FindAllUserDto } from './dto/find-all.dto';
import { GetUserNotificationsDto } from '../../common/services/notification/dto';
import type { LoggerService } from '../../common/services/logger/logger-options.interface';
import { OnQueueRemoved } from '@nestjs/bull';
import { ErrorUtil } from '../../common/utils/error.util';

@Injectable()
export class UserService {
  private _write;
  private _read;

  constructor(
    private prisma: DatabaseService,
    private encryption: EncryptionService,
    private cloudinaryService: CloudinaryService,
    @Inject('LoggerService') private logger: LoggerService,
  ) {
    this._write = this.prisma.master;
    this._read = this.prisma.replica;
  }

  public async create(dto: CreateUserDto): Promise<SanitizeUser> {
    try {
      this.logger.debug(
        `📝 Creating user with email: ${dto.email}`,
        'UserService',
      );
      const isUserExist: boolean = await this._read.user.findUnique({
        where: { email: dto.email },
      });

      if (isUserExist) {
        this.logger.warn(`⚠️ User already exists: ${dto.email}`, 'UserService');
        throw new ConflictException(`User Already Exists With Email ❌.`);
      }

      const { firstName, lastName, email, password } = dto;
      const hashPassword = await this.encryption.hash(password);
      this.logger.debug(`🔐 Password hashed for: ${dto.email}`, 'UserService');

      const createUser: User = await this._write.user.create({
        data: { firstName, lastName, email, password: hashPassword },
      });

      this.logger.info(
        `✅ User created: ${createUser.id} - ${createUser.email}`,
        'UserService',
      );

      return this.sanitizeUser(createUser);
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in create user: ${message}`,
        'UserService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async findAll(dto: FindAllUserDto): Promise<FindAll<SanitizeUser>> {
    try {
      this.logger.info(
        `🔍 Finding all user with page: ${dto.page} & limit: ${dto.limit}`,
        'UserService',
      );

      const {
        limit = 20,
        page = 1,
        search,
        email,
        firstName,
        lastName,
        userName,
        userStatus,
        deletedBy,
        isDeleted,
      } = dto;

      const finalLimit = Math.min(Math.max(limit, 1), 50);
      const skip = (page - 1) * finalLimit;

      const where = this.buildWhereClause({
        search,
        email,
        firstName,
        lastName,
        userName,
        userStatus,
        deletedBy,
        isDeleted,
      });

      const [data, total] = await Promise.all([
        this._read.user.findMany({
          where,
          skip,
          take: finalLimit,
          orderBy: { createdAt: 'desc' },
          select: this.getUserSelectFields(),
        }),
        this._read.user.count({ where }),
      ]);

      this.logger.info(`✅ Founded ${data.length} user`, 'UserService');

      const totalPages = Math.ceil(total / finalLimit);

      return {
        data,
        total,
        limit: finalLimit,
        page,
        pages: totalPages,
      };
    } catch (error) {
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in find all user: ${message}`,
        'UserService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async findOne(id: string): Promise<SanitizeUser> {
    try {
      if (!id) {
        throw new BadRequestException('User ID is required');
      }
      this.logger.debug(`🔍 Finding user: ${id}`, 'UserService');
      const user: User = await this._read.user.findUnique({ where: { id } });
      if (!user) {
        this.logger.warn(`⚠️ User not found: ${id}`, 'UserService');
        throw new NotFoundException(`User Not Found With ID ${id} ❌.`);
      }

      this.logger.info(
        `✅ A user with the full ${user.firstName} ${user.lastName} was found.", "UserService`,
      );

      return this.sanitizeUser(user);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in find one user: ${message}`,
        'UserService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async secureFindOne(id: string): Promise<SanitizeUser> {
    const user: SanitizeUser = await this.findOne(id);
    if (user.deletedAt) {
      this.logger.warn(
        `⚠️ User with id: ${id} has already been deleted`,
        'UserService',
      );
      throw new BadRequestException('This User Has Already Been Deleted.');
    } else if (user.userStatus === 'BANNED') {
      this.logger.warn(
        `⚠️ User with id: ${id} has been blocked`,
        'UserService',
      );
      throw new BadRequestException('This User Has Been Blocked.');
    } else if (user.userStatus === 'INACTIVE') {
      this.logger.warn(
        `⚠️ User with id: ${id} has been inactive`,
        'UserService',
      );
      throw new BadRequestException('This User Has Already Been InActive.');
    }

    return user;
  }

  public async update(id: string, dto: UpdateUserDto): Promise<SanitizeUser> {
    try {
      await this.secureFindOne(id);

      this.logger.info(`🧩 Updating user: ${id}`, 'UserService');

      const updateData = pick(dto, [
        'firstName',
        'lastName',
        'email',
        'bio',
        'avatar',
        'userName',
      ]);

      const updatedUser: User = await this._write.user.update({
        where: { id },
        data: updateData,
      });

      this.logger.info(
        `🧩 User updated: ${updatedUser.firstName} ${updatedUser.lastName}`,
        'UserService',
      );

      return this.sanitizeUser(updatedUser);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in update user: ${message}`,
        'UserService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async remove(id: string): Promise<SanitizeUser> {
    try {
      await this.secureFindOne(id);

      this.logger.info(`🗑️ Deleting user: ${id}`, 'UserService');

      const removeUser: User = await this._write.user.delete({
        where: { id },
      });

      this.logger.info(
        `✅ User deleted: ${removeUser.firstName} ${removeUser.email}`,
        'UserService',
      );

      return this.sanitizeUser(removeUser);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in remove user: ${message}`,
        'UserService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async findOneByEmail(email: string): Promise<User> {
    try {
      this.logger.debug(`🔍 Finding user: ${email}`, 'UserService');
      const user = await this._read.user.findUnique({
        where: { email },
      });

      if (!user) {
        this.logger.warn(`⚠️ User not found: ${email}`, 'UserService');
        throw new NotFoundException(`User Not Found With Email ❌.`);
      }
      if (user.deletedAt) {
        this.logger.warn(
          `⚠️ User with ${email} has already deleted`,
          'UserService',
        );
        throw new BadRequestException('This User Has Already Been Deleted.');
      }

      this.logger.info(
        `✅ A user with the full ${user.firstName} ${user.lastName} was found.", "UserService`,
      );

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in find one by email user: ${message}`,
        'UserService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  private sanitizeUser(user: User): SanitizeUser {
    const {
      password,
      createdAt,
      updatedAt,
      sellerInfo,
      sellerVerified,
      deleteReason,
      deletedBy,
      isDeleted,
      ...sanitizedUser
    } = user;
    return sanitizedUser;
  }

  public async uploadAvatar(file: Express.Multer.File, userId: string) {
    try {
      this.logger.info(
        `📷 Upload image to profile for user: ${userId}`,
        'UserService',
      );

      await this.secureFindOne(userId);

      const uploadResult = await this.cloudinaryService.uploadAvatar(
        file,
        userId,
      );

      this.logger.info(`🔗 Getting profile image url`, 'UserService');

      const userImages = await this._write.userImage.create({
        data: {
          userId,
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          isActive: true,
          mimeType: file.mimetype,
          size: file.size,
        },
      });

      this.logger.info(
        `✅ Create a image source for user ${userId}`,
        'UserService',
      );

      await this.update(userId, { avatar: uploadResult.secure_url });

      this.logger.info(`✅ Add image to profile`, 'UserService');

      return {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        imageId: userImages.id,
      };
    } catch (error) {
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in upload avatar user: ${message}`,
        'UserService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async removeAvatar(userId: string) {
    try {
      this.logger.info(
        `🗑️ Deleting user: ${userId} profile image`,
        'UserService',
      );

      const user = await this.secureFindOne(userId);

      if (!user.avatar) {
        this.logger.warn(
          `⚠️ User profile image not found: ${userId}`,
          'UserService',
        );
        throw new BadRequestException('User has no avatar');
      }

      const userImage = await this._write.userImage.findFirst({
        where: {
          userId,
          url: user.avatar,
          isActive: true,
        },
      });

      this.logger.info(`✅ Found user profile image`, 'UserService');

      if (userImage) {
        await this.cloudinaryService.deleteFile(userImage.publicId);
        this.logger.info(
          `✅ Remove user profile image from Cloudinary`,
          'UserService',
        );
        await this._write.userImage.update({
          where: { id: userImage.id },
          data: { isActive: false },
        });
        this.logger.info(
          `✅ Remove user profile image from database`,
          'UserService',
        );
      }

      this.logger.info(
        `✅ Deleting user profile image successfuly`,
        'UserService',
      );

      return this._write.user.update({
        where: { id: userId },
        data: { avatar: null },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in remove avatar user: ${message}`,
        'UserService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async getUserImages(userId: string) {
    try {
      this.logger.info(`✅ Finding user profile images`, 'UserService');

      await this.secureFindOne(userId);

      const userImages: UserImage[] = await this._read.userImage.findMany({
        where: {
          userId,
          isActive: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          url: true,
          publicId: true,
          createdAt: true,
          mimeType: true,
          size: true,
        },
      });

      this.logger.info(
        `✅ Founded ${userImages.length} from user: ${userId}`,
        'UserService',
      );

      return userImages;
    } catch (error) {
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in get user images user: ${message}`,
        'UserService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async updateRefreshToken(userId: string, refreshTokenId: string) {
    try {
      this.logger.debug(
        `🔄 Updating refresh token for user: ${userId}`,
        'UserService',
      );

      await this.secureFindOne(userId);

      const updateToken = await this._write.user.update({
        where: { id: userId },
        data: { refreshTokens: { connect: { id: refreshTokenId } } },
      });

      this.logger.info(
        `✅ Refresh token updated successfully for user: ${userId}`,
        'UserService',
      );

      return this.sanitizeUser(updateToken);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in update refresh token user: ${message}`,
        'UserService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async getUserDevices(userId: string) {
    try {
      this.logger.debug(`🔍 getUserDevices - User: ${userId}`, 'UserService');

      await this.secureFindOne(userId);

      const now = new Date();

      const devices = await this._read.refreshToken.groupBy({
        by: ['deviceId', 'deviceType', 'deviceInfo'],
        where: {
          userId: userId,
          expiresAt: { gt: now },
          isRevoked: false,
          deviceId: { not: null },
        },
        _max: {
          lastUsedAt: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
        },
        _count: {
          _all: true,
        },
        orderBy: {
          _max: {
            lastUsedAt: 'desc',
          },
        },
      });

      const deviceIds = devices
        .map((d) => d.deviceId)
        .filter(Boolean) as string[];

      const locationData = await this._read.refreshToken.findMany({
        where: {
          userId: userId,
          deviceId: { in: deviceIds },
          expiresAt: { gt: now },
          isRevoked: false,
          location: { not: Prisma.JsonNull },
        },
        select: {
          deviceId: true,
          location: true,
        },
        distinct: ['deviceId'],
      });

      const locationMap = new Map(
        locationData.map((item) => [item.deviceId, item.location]),
      );

      const allDevices = devices.map((device) => ({
        deviceId: device.deviceId,
        deviceType: device.deviceType,
        deviceInfo: device.deviceInfo,
        lastUsedAt: device._max?.lastUsedAt,
        ipAddress: device._max?.ipAddress,
        userAgent: device._max?.userAgent,
        location: locationMap.get(device.deviceId) || null,
        firstSeen: device._max?.createdAt,
        activeSessions: device._count?._all || 0,
      }));

      this.logger.info(
        `✅ getUserDevices - User: ${userId}, Devices: ${allDevices.length}`,
        'UserService',
      );

      return allDevices;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in get user devices user: ${message}`,
        'UserService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async getDeviceDetails(userId: string, deviceId: string) {
    try {
      this.logger.debug(
        `🔍 getDeviceDetails - User: ${userId}, Device: ${deviceId.substring(0, 8)}...`,
        'UserService',
      );

      this.secureFindOne(userId);
      const token = await this._read.refreshToken.findFirst({
        where: {
          userId: userId,
          deviceId: deviceId,
          isRevoked: false,
        },
        select: {
          deviceId: true,
          deviceType: true,
          deviceInfo: true,
          ipAddress: true,
          userAgent: true,
          location: true,
          lastUsedAt: true,
          createdAt: true,
          expiresAt: true,
        },
      });

      if (!token) {
        this.logger.warn(
          `⚠️ Device not found - User: ${userId}, Device: ${deviceId.substring(0, 8)}...`,
          'UserService',
        );
        throw new NotFoundException(
          'The specified device was not found or is inactive.',
        );
      }

      this.logger.info(
        `✅ Device details fetched - User: ${userId}, Device: ${token.deviceInfo || 'Unknown'}`,
        'UserService',
      );

      return token;
    } catch (error) {
      if (error instanceof NotFoundException) return error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in get user device details user: ${message}`,
        'UserService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async manageUserStatus(
    userId: string,
    action: UserActions,
    reason?: string,
  ) {
    try {
      this.logger.info(
        `🔄 Managing user status: ${action} for user ${userId}`,
        'UserService',
      );

      await this.secureFindOne(userId);

      let updateData: any = {};
      let successMessage = '';

      switch (action) {
        case UserActions.Restore:
          updateData = {
            userStatus: UserStatus.Active,
            deletedAt: null,
            deleteReason: null,
            isDeleted: false,
          };
          successMessage = `✅ User ${userId} restored successfully`;
          break;

        case UserActions.SoftDelete:
          updateData = {
            userStatus: UserStatus.In_Active,
            deletedAt: new Date(),
            deleteReason: reason || AccountAction.USER_DELETE_REASON,
            isDeleted: true,
          };
          successMessage = `✅ User ${userId} restored successfully`;
          break;

        case UserActions.InActive:
          updateData = {
            userStatus: UserStatus.In_Active,
          };
          successMessage = `✅ User ${userId} deactivated successfully`;
          break;

        case UserActions.Ban:
          updateData = {
            userStatus: UserStatus.Banned,
          };
          successMessage = `✅ User ${userId} banned successfully`;
          break;

        case UserActions.Active:
          updateData = {
            userStatus: UserStatus.Active,
          };
          successMessage = `✅ User ${userId} activated successfully`;
          break;

        default:
          throw new BadRequestException(`Invalid action: ${action}`);
      }

      const updatedUser = await this._write.user.update({
        where: { id: userId },
        data: updateData,
      });

      this.logger.info(successMessage, 'UserService');

      return this.sanitizeUser(updatedUser);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Failed to ${action} user ${userId}: ${message}`,
        'UserService',
      );
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  public async softDelete(userId: string, reason?: string) {
    return await this.manageUserStatus(userId, UserActions.SoftDelete, reason);
  }

  public async ban(userId: string) {
    return await this.manageUserStatus(userId, UserActions.Ban);
  }

  public async inActive(userId: string) {
    return await this.manageUserStatus(userId, UserActions.InActive);
  }

  public async active(userId: string) {
    return await this.manageUserStatus(userId, UserActions.Active);
  }

  public async restore(userId: string) {
    return await this.manageUserStatus(userId, UserActions.Restore);
  }

  public async getUserNotifications(
    userId: string,
    filters?: GetUserNotificationsDto,
  ) {
    try {
      this.logger.debug(
        `🔍 Fetching notifications for user: ${userId}`,
        'NotificationService',
      );

      await this.secureFindOne(userId);

      const { limit = 20, page = 1, ...rest } = filters || {};
      const finalLimit = Math.min(Math.max(limit, 1), 50);
      const skip = (page - 1) * finalLimit;

      this.logger.debug(
        `📊 Query params - Limit: ${finalLimit}, Page: ${page}`,
        'NotificationService',
      );

      const where = this.buildNotificationWhereClause(userId, rest);

      const [notifications, totalCount, unreadCount] = await Promise.all([
        this.prisma.replica.userNotification.findMany({
          where,
          skip,
          take: finalLimit,
          orderBy: {
            [rest.sortBy === 'createdAt' ? 'createdAt' : 'deliveredAt']:
              rest.sortOrder || 'desc',
          },
          include: {
            notification: {
              select: {
                id: true,
                title: true,
                message: true,
                content: true,
                type: true,
                priority: true,
                isBroadcast: true,
                link: true,
                icon: true,
                sentAt: true,
                createdAt: true,
              },
            },
          },
        }),
        this.prisma.replica.userNotification.count({ where: { userId } }),
        this.prisma.replica.userNotification.count({
          where: { userId, isRead: false },
        }),
      ]);

      const priorityCounts = await this.getUserNotificationStats(userId);

      this.logger.info(
        `✅ Notifications fetched for user ${userId}: ${notifications.length}/${totalCount} items, Unread: ${unreadCount}`,
        'NotificationService',
      );

      return {
        data: notifications.map((n) => ({
          ...pick(n, [
            'id',
            'userId',
            'isRead',
            'readAt',
            'deliveredAt',
            'isDismissedAt',
          ]),
          notification: pick(n.notification, [
            'id',
            'title',
            'message',
            'content',
            'type',
            'priority',
            'isBroadcast',
            'link',
            'icon',
            'sentAt',
            'createdAt',
          ]),
        })),
        pagination: {
          limit: finalLimit,
          page,
          pages: Math.ceil(totalCount / finalLimit),
          total: totalCount,
        },
        stats: {
          totalCount,
          unreadCount,
          readCount: totalCount - unreadCount,
          priorityCounts,
        },
      };
    } catch (error) {
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in get user notifications user: ${message}`,
        'UserService',
      );
      throw error;
    }
  }

  public async getUserNotificationStats(userId: string) {
    try {
      this.logger.debug(
        `📊 Fetching notification stats for user: ${userId}`,
        'NotificationService',
      );

      const [total, unread] = await Promise.all([
        this.prisma.replica.userNotification.count({
          where: { userId },
        }),
        this.prisma.replica.userNotification.count({
          where: {
            userId,
            isRead: false,
          },
        }),
      ]);

      this.logger.info(
        `✅ Notification stats fetched for user ${userId} -> Total: ${total}, Unread: ${unread}, Read: ${total - unread}`,
        'NotificationService',
      );

      return {
        total,
        unread,
        read: total - unread,
      };
    } catch (error) {
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in get user notification stats user: ${message}`,
        'UserService',
      );
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  private buildWhereClause(filters: {
    search?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    userName?: string;
    userStatus?: string;
    deletedBy?: string;
    isDeleted?: boolean;
  }): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    const exactFilters: Record<string, any> = {
      email: filters.email,
      firstName: filters.firstName,
      lastName: filters.lastName,
      userName: filters.userName,
      userStatus: filters.userStatus,
      deletedBy: filters.deletedBy,
      isDeleted: filters.isDeleted,
    };

    Object.entries(exactFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (
          key === 'userStatus' ||
          key === 'isDeleted' ||
          key === 'deletedBy'
        ) {
          where[key] = value;
        } else {
          where[key] = { contains: value, mode: 'insensitive' };
        }
      }
    });

    const searchTerm = filters.search?.trim();
    if (searchTerm) {
      where.OR = [
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { userName: { contains: searchTerm, mode: 'insensitive' } },
        { id: searchTerm },
      ];
    }

    return where;
  }

  private getUserSelectFields() {
    return {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatar: true,
      bio: true,
      userName: true,
      lastLoginAt: true,
      userStatus: true,
      isDeleted: true,
      deletedAt: true,
      deletedBy: true,
    };
  }

  private buildNotificationWhereClause(
    userId: string,
    filters: GetUserNotificationsDto,
  ): any {
    const { type, priority, isRead, isBroadcast, fromDate, toDate, search } =
      filters;

    const where: any = {
      userId,
      notification: {
        status: 'SENT',
      },
    };

    const notificationFilters = {
      ...(type && { type }),
      ...(priority && { priority }),
      ...(isBroadcast !== undefined && { isBroadcast }),
    };

    if (Object.keys(notificationFilters).length > 0) {
      where.notification = { ...where.notification, ...notificationFilters };
    }

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    if (fromDate || toDate) {
      where.deliveredAt = {
        ...(fromDate && { gte: new Date(fromDate) }),
        ...(toDate && { lte: new Date(toDate) }),
      };
    }

    if (search?.trim()) {
      where.notification.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { message: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    return where;
  }
}
