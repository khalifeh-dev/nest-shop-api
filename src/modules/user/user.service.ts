import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DatabaseService } from '../../common/database/database.service';
import { Prisma, User } from '@prisma/client';
import { EncryptionService } from '../../common/services/encryption/encryption.service';
import { FindAll } from '../../common/types/find-all.type';
import { pick } from 'lodash';
import { SanitizeUser } from '../../common/types/user.type';
import { CloudinaryService } from '../../common/services/cloudinary/cloudinary.service';
import { UserAction, UserStatus } from '../../common/constants/user.constant';

@Injectable()
export class UserService {
  private _write;
  private _read;

  constructor(
    private prisma: DatabaseService,
    private encryption: EncryptionService,
    private cloudinaryService: CloudinaryService,
  ) {
    this._write = this.prisma.master;
    this._read = this.prisma.replica;
  }

  public async create(dto: CreateUserDto): Promise<SanitizeUser> {
    try {
      const isUserExist = await this._read.user.findUnique({
        where: { email: dto.email },
      });

      if (isUserExist)
        throw new ConflictException(`User Already Exists With Email ❌.`);

      const { firstName, lastName, email, password } = dto;
      const hashPassword = await this.encryption.hash(password);

      const createUser = await this._write.user.create({
        data: { firstName, lastName, email, password: hashPassword },
      });
      return this.sanitizeUser(createUser);
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async findAll(
    limit: number = 20,
    page: number = 1,
  ): Promise<FindAll<SanitizeUser>> {
    try {
      const finalLimit = Math.min(Math.max(limit, 1), 50);
      const skip = (page - 1) * finalLimit;

      const [data, total] = await Promise.all([
        this._read.user.findMany({
          skip,
          take: finalLimit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            bio: true,
            userName: true,
            lastLoginAt: true,
            userStatus: true,
          },
        }),
        this._read.user.count(),
      ]);

      const totalPages = Math.ceil(total / finalLimit);

      return {
        data,
        total,
        limit: finalLimit,
        page,
        pages: totalPages,
      };
    } catch (error) {
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async findOne(id: string): Promise<SanitizeUser> {
    try {
      const user = await this._read.user.findUnique({ where: { id } });
      if (!user)
        throw new NotFoundException(`User Not Found With ID ${id} ❌.`);

      return this.sanitizeUser(user);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async secureFindOne(id: string): Promise<SanitizeUser> {
    const user = await this.findOne(id);
    if (user.deletedAt)
      throw new BadRequestException('This User Has Already Been Deleted.');
    return user;
  }

  public async update(id: string, dto: UpdateUserDto): Promise<SanitizeUser> {
    try {
      await this.secureFindOne(id);

      const updateData = pick(dto, [
        'firstName',
        'lastName',
        'email',
        'bio',
        'avatar',
        'userName',
      ]);

      const updateduser = await this._write.user.update({
        where: { id },
        data: updateData,
      });

      return this.sanitizeUser(updateduser);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async remove(id: string): Promise<SanitizeUser> {
    try {
      await this.secureFindOne(id);
      const removeUser = await this._write.user.delete({
        where: { id },
      });
      return this.sanitizeUser(removeUser);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async findOneByEmail(email: string): Promise<User> {
    try {
      const user = await this._read.user.findUnique({
        where: { email },
      });

      if (!user) throw new NotFoundException(`User Not Found With Email ❌.`);

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
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
      await this.secureFindOne(userId);
      const uploadResult = await this.cloudinaryService.uploadAvatar(
        file,
        userId,
      );

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

      await this.update(userId, { avatar: uploadResult.secure_url });

      return {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        imageId: userImages.id,
      };
    } catch (error) {
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async removeAvatar(userId: string) {
    try {
      const user = await this._read.user.findUnique({
        where: { id: userId },
        select: { avatar: true, id: true },
      });

      if (user.deletedAt)
        throw new BadRequestException('This User Has Already Been Deleted.');

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.avatar) {
        throw new BadRequestException('User has no avatar');
      }

      const userImage = await this._write.userImage.findFirst({
        where: {
          userId,
          url: user.avatar,
          isActive: true,
        },
      });

      if (userImage) {
        await this.cloudinaryService.deleteFile(userImage.publicId);
        await this._write.userImage.update({
          where: { id: userImage.id },
          data: { isActive: false },
        });
      }

      return this._write.user.update({
        where: { id: userId },
        data: { avatar: null },
      });
    } catch (error) {
      if (error instanceof NotFoundException) return error;
      if (error instanceof BadRequestException) return error;
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async getUserImages(userId: string) {
    try {
      await this.secureFindOne(userId);
      return await this._read.userImage.findMany({
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
    } catch (error) {
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async updateRefreshToken(userId: string, refreshTokenId: string) {
    try {
      await this.secureFindOne(userId);

      const updateToken = await this._write.user.update({
        where: { id: userId },
        data: { refreshTokens: { connect: { id: refreshTokenId } } },
      });

      return this.sanitizeUser(updateToken);
    } catch (error) {
      if (error instanceof NotFoundException) return error;
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async getUserDevices(userId: string) {
    try {
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

      return devices.map((device) => ({
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
    } catch (error) {
      if (error instanceof NotFoundException) return error;
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async getDeviceDetails(userId: string, deviceId: string) {
    try {
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

      if (!token)
        throw new NotFoundException(
          'The specified device was not found or is inactive.',
        );

      return token;
    } catch (error) {
      if (error instanceof NotFoundException) return error;
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async softDeleteUser(userId: string, reason?: string) {
    try {
      await this.findOne(userId);
      const updateUser = await this._write.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          deleteReason: reason || UserAction.USER_DELETE_REASON,
          isDeleted: true,
        },
      });

      return this.sanitizeUser(updateUser);
    } catch (error) {
      if (error instanceof NotFoundException) return error;
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async restoreUser(userId: string) {
    try {
      await this.secureFindOne(userId);

      const updateUser = await this._write.user.update({
        where: { id: userId },
        data: {
          deletedAt: null,
          deleteReason: null,
          isDeleted: false,
        },
      });

      return this.sanitizeUser(updateUser);
    } catch (error) {
      if (error instanceof NotFoundException) return error;
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async inActiveUser(userId: string) {
    try {
      await this.secureFindOne(userId);

      const updatedUser = await this.updateUserStatus(
        userId,
        UserStatus.In_Active,
      );

      return this.sanitizeUser(updatedUser);
    } catch (error) {
      if (error instanceof NotFoundException) return error;
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async banUser(userId: string) {
    try {
      await this.secureFindOne(userId);

      const updatedUser = await this.updateUserStatus(
        userId,
        UserStatus.Banned,
      );

      return this.sanitizeUser(updatedUser);
    } catch (error) {
      if (error instanceof NotFoundException) return error;
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  private async updateUserStatus(userId: string, status: UserStatus) {
    return await this._write.user.update({
      where: { id: userId },
      data: { userStatus: status },
    });
  }
}
