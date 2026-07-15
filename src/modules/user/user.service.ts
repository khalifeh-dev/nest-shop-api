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
import { User } from '@prisma/client';
import { EncryptionService } from '../../common/services/encryption/encryption.service';
import { FindAll } from '../../common/types/find-all.type';
import { pick } from 'lodash';
import { SanitizeUser } from '../../common/types/user.type';
import { CloudinaryService } from '../../common/services/cloudinary/cloudinary.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: DatabaseService,
    private encryption: EncryptionService,
    private cloudinaryService: CloudinaryService,
  ) {}

  public async create(dto: CreateUserDto): Promise<SanitizeUser> {
    try {
      const isUserExist = await this.prisma.replica.user.findUnique({
        where: { email: dto.email },
      });

      if (isUserExist)
        throw new ConflictException(`User Already Exists With Email ❌.`);

      const { firstName, lastName, email, password } = dto;
      const hashPassword = await this.encryption.hash(password);

      const createUser = await this.prisma.master.user.create({
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
        this.prisma.replica.user.findMany({
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
            userStatus: true
          },
        }),
        this.prisma.replica.user.count(),
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
      const user = await this.prisma.replica.user.findUnique({ where: { id } });
      if (!user)
        throw new NotFoundException(`User Not Found With ID ${id} ❌.`);
      return this.sanitizeUser(user);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async update(id: string, dto: UpdateUserDto): Promise<SanitizeUser> {
    try {
      await this.findOne(id);

      const updateData = pick(dto, [
        'firstName',
        'lastName',
        'email',
        'bio',
        'avatar',
        'userName',
      ]);

      const updateduser = await this.prisma.master.user.update({
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
      await this.findOne(id);
      const removeUser = await this.prisma.master.user.delete({
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
      const user = await this.prisma.replica.user.findUnique({
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
      ...sanitizedUser
    } = user;
    return sanitizedUser;
  }

  public async uploadAvatar(file: Express.Multer.File, userId: string) {
    const uploadResult = await this.cloudinaryService.uploadAvatar(
      file,
      userId,
    );

    const userImages = await this.prisma.master.userImage.create({
      data: {
        userId,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        isActive: true,
        mimeType: file.mimetype,
        size: file.size,
      },
    });

    const updateUserAvatar = await this.prisma.master.user.update({
      where: { id: userId },
      data: { avatar: uploadResult.secure_url },
    });

    return {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      imageId: userImages.id,
    };
  }

  public async removeAvatar(userId: string) {
    const user = await this.prisma.replica.user.findUnique({
      where: { id: userId },
      select: { avatar: true, id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.avatar) {
      throw new BadRequestException('User has no avatar');
    }

    const userImage = await this.prisma.master.userImage.findFirst({
      where: {
        userId,
        url: user.avatar,
        isActive: true,
      },
    });

    if (userImage) {
      await this.cloudinaryService.deleteFile(userImage.publicId);
      await this.prisma.master.userImage.update({
        where: { id: userImage.id },
        data: { isActive: false },
      });
    }

    return this.prisma.master.user.update({
      where: { id: userId },
      data: { avatar: null },
    });
  }

  public async getUserImages(userId: string) {
    return await this.prisma.replica.userImage.findMany({
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
  }

  public async updateRefreshToken(userId: string, refreshTokenId: string) {
    await this.findOne(userId);

    const updateToken = await this.prisma.master.user.update({
      where: { id: userId },
      data: { refreshTokens: { connect: { id: refreshTokenId } } },
    });

    return this.sanitizeUser(updateToken);
  }
}
