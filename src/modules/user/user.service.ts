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

@Injectable()
export class UserService {
  constructor(
    private prisma: DatabaseService,
    private encryption: EncryptionService,
  ) {}

  public async create(dto: CreateUserDto): Promise<SanitizeUser> {
    try {
      const isUserExist = await this.prisma.replica.user.findUnique({
        where: { email: dto.email },
      });

      if (isUserExist)
        throw new ConflictException(`User Already Exists With Email ❌.`);

      const { firstName, lastName, email, password } = dto;
      const hashPassword = await this.encryption.hashPassword(password);

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

  public async findOneByEmail(email: string): Promise<SanitizeUser> {
    try {
      const user = await this.prisma.replica.user.findUnique({
        where: { email },
      });

      if (!user) throw new NotFoundException(`User Not Found With Email ❌.`);

      return this.sanitizeUser(user);
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
}
