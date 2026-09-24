import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { LoggerService } from '../../common/services/logger/logger-options.interface';
import { UserService } from '../user/user.service';
import { DatabaseService } from '../../common/database/database.service';
import { ErrorUtil } from '../../common/utils/error.util';
import { CreateDiscountForUserDto } from './dto';
import { DiscountStatus, DiscountType } from '@prisma/client';

@Injectable()
export class DiscountService {
  constructor(
    private prisma: DatabaseService,
    @Inject('LoggerService') private logger: LoggerService,
    private userService: UserService,
  ) {}

  public async createForUser(dto: CreateDiscountForUserDto) {
    try {
      this.logger.info(
        `🎟️ Creating discount "${dto.code}" for user: ${dto.userId}`,
        'DiscountService',
      );

      await this.userService.secureFindOne(dto.userId);
      await this.findOne(dto.code)

      const startsAt = new Date(dto.startsAt);
      const expiresAt = new Date(dto.expiresAt);
      const now = new Date();

      if (startsAt >= expiresAt) {
        this.logger.warn(
          `Start date must be before expiry date.`,
          'DiscountService',
        );
        throw new BadRequestException('Start date must be before expiry date.');
      }

      if (expiresAt < now) {
        this.logger.warn(
          `Expiry date must be in the future.`,
          'DiscountService',
        );
        throw new BadRequestException('Expiry date must be in the future.');
      }

      if (dto.type === DiscountType.PERCENTAGE && dto.value > 100) {
        this.logger.warn(
          `Percentage discount value cannot exceed 100.`,
          'DiscountService',
        );
        throw new BadRequestException(
          'Percentage discount value cannot exceed 100.',
        );
      }

      if (dto.value <= 0) {
        this.logger.warn(
          `Discount value must be greater than 0.`,
          'DiscountService',
        );
        throw new BadRequestException('Discount value must be greater than 0.');
      }

      if (
        dto.maxAmount &&
        dto.minOrderAmount &&
        dto.maxAmount < dto.minOrderAmount
      ) {
        this.logger.warn(
          `Max amount cannot be less than min order amount.`,
          'DiscountService',
        );
        throw new BadRequestException(
          'Max amount cannot be less than min order amount.',
        );
      }

      const discount = await this.prisma.master.$transaction(async (tx) => {
        const newDiscount = await tx.discount.create({
          data: {
            code: dto.code,
            title: dto.title,
            description: dto.description,
            type: dto.type || DiscountType.PERCENTAGE,
            scope: 'USER_SPECIFIC',
            value: dto.value,
            maxAmount: dto.maxAmount,
            minOrderAmount: dto.minOrderAmount,
            usageLimit: dto.usageLimit || 1,
            perUserLimit: dto.perUserLimit || 1,
            startsAt,
            expiresAt,
            status: DiscountStatus.ACTIVE,
            targetType: 'USER',
            isFirstOrder: false,

            users: {
              connect: { id: dto.userId },
            },
          },
          include: {
            users: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        return newDiscount;
      });

      this.logger.info(
        `✅ Discount created successfully: ${discount.id} (code: ${discount.code})`,
        'DiscountService',
      );

      return discount;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in create address: ${message}`,
        'AddressService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async findOne(code: string) {
    try {
      this.logger.info(`🔍 Find a code: ${code}`, 'DiscountService');

      const findCode = await this.prisma.replica.discount.findUnique({
        where: { code },
      });

      if (findCode) {
        this.logger.warn(
          `Discount with code "${code}" already exists.`,
          'DiscountService',
        );
        throw new ConflictException(
          `Discount with code "${code}" already exists.`,
        );
      }
      this.logger.info(
        `✅ Found a code: ${code} successfuly`,
        'DiscountService',
      );

      return findCode;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in find one address: ${message}`,
        'AddressService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }
}
