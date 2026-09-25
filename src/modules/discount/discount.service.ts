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
import {
  CreateDiscountForAllUsersDto,
  CreateDiscountForGroupDto,
  CreateDiscountForUserDto,
  UpdateDiscountDto,
} from './dto';
import {
  DiscountStatus,
  DiscountTargetType,
  DiscountType,
} from '@prisma/client';
import { BulkValidator } from '../../common/utils/validate-bulk.util';

@Injectable()
export class DiscountService {
  constructor(
    private prisma: DatabaseService,
    @Inject('LoggerService') private logger: LoggerService,
    private userService: UserService,
    private bulkValidator: BulkValidator,
  ) {}

  public async createForUser(dto: CreateDiscountForUserDto) {
    try {
      this.logger.info(
        `🎟️ Creating discount "${dto.code}" for user: ${dto.userId}`,
        'DiscountService',
      );

      await this.userService.secureFindOne(dto.userId);
      await this.checkUniqueCode(dto.code);

      const { expiresAt, startsAt } = this.checkDate(
        dto.startsAt,
        dto.expiresAt,
      );
      const now = new Date();

      if (expiresAt < now) {
        this.logger.warn(
          `Expiry date must be in the future.`,
          'DiscountService',
        );
        throw new BadRequestException('Expiry date must be in the future.');
      }

      this.checkValue(dto.type, dto.value, 100);

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
        `❌ Unexpected error in create discount for a user: ${message}`,
        'DiscountService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async checkUniqueCode(code: string, excludeId?: string) {
    try {
      this.logger.info(`🔍 Find a code: ${code}`, 'DiscountService');

      const findCode = await this.prisma.replica.discount.findFirst({
        where: {
          code,
          ...(excludeId && { id: { not: excludeId } }),
        },
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
        `❌ Unexpected error in find one discount: ${message}`,
        'DiscountService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async createForUsers(dto: CreateDiscountForAllUsersDto) {
    try {
      this.logger.info(`🧩 Create discount for all user`, 'DiscountService');

      await this.checkUniqueCode(dto.code);

      const { expiresAt, startsAt } = this.checkDate(
        dto.startsAt,
        dto.expiresAt,
      );

      this.checkValue(dto.type, dto.value, 100);

      const discount = await this.prisma.master.discount.create({
        data: {
          code: dto.code,
          title: dto.title,
          description: dto.description,
          type: dto.type || DiscountType.PERCENTAGE,
          scope: dto.scope || 'ALL_PRODUCTS',
          value: dto.value,
          maxAmount: dto.maxAmount,
          minOrderAmount: dto.minOrderAmount,
          usageLimit: dto.usageLimit || 1000,
          perUserLimit: dto.perUserLimit || 1,
          startsAt,
          expiresAt,
          status: DiscountStatus.ACTIVE,
          isFirstOrder: dto.isFirstOrder || false,
        },
      });

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
        `❌ Unexpected error in create discount for all users: ${message}`,
        'DiscountService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async createForGroup(dto: CreateDiscountForGroupDto) {
    try {
      this.logger.info(`🧩 Create discount for group`, 'DiscountService');

      await this.checkUniqueCode(dto.code);

      await Promise.all([
        this.bulkValidator.validateUsers(dto.userIds),
        this.bulkValidator.validateProducts(dto.productIds || []),
        this.bulkValidator.validateCategories(dto.categoryIds || []),
      ]);

      const { expiresAt, startsAt } = this.checkDate(
        dto.startsAt,
        dto.expiresAt,
      );

      this.checkValue(dto.type, dto.value, 100);

      const discount = await this.prisma.master.discount.create({
        data: {
          code: dto.code,
          title: dto.title,
          description: dto.description,
          type: dto.type || DiscountType.PERCENTAGE,
          scope: 'SPECIFIC_PRODUCTS',
          value: dto.value,
          maxAmount: dto.maxAmount,
          minOrderAmount: dto.minOrderAmount,
          usageLimit: dto.usageLimit || 1,
          perUserLimit: dto.perUserLimit || 1,
          startsAt,
          expiresAt,
          status: DiscountStatus.ACTIVE,
          targetType: dto.targetType || DiscountTargetType.USER,

          users: {
            connect: dto.userIds.map((id) => ({ id })),
          },
          products: {
            create: dto.productIds?.map((id) => ({ productId: id })) || [],
          },
          categories: {
            create: dto.categoryIds?.map((id) => ({ categoryId: id })) || [],
          },
        },
        include: {
          users: true,
          products: true,
          categories: true,
        },
      });

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
        `❌ Unexpected error in create discount for group: ${message}`,
        'DiscountService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async findOne(discountId: string, includeDeleted: boolean = false) {
    try {
      this.logger.info(
        `🔍 Find discount with ID: ${discountId}`,
        'DiscountService',
      );

      const discount = await this.prisma.replica.discount.findUnique({
        where: {
          id: discountId,
          ...(includeDeleted ? {} : { isDeleted: false }),
        },
        include: {
          users: true,
          products: true,
          categories: true,
        },
      });

      if (!discount) {
        this.logger.warn(
          `⛔ Discount not found with ID: ${discountId}`,
          'DiscountService',
        );
        throw new NotFoundException(
          `Discount not found with ID: ${discountId}`,
        );
      }

      if (!discount.isDeleted) {
        throw new BadRequestException(
          `Discount with ID ${discountId} is not deleted.`,
        );
      }

      this.logger.info(
        `✅ Found discount with ID: ${discountId} successfuly`,
        'DiscountService',
      );

      return discount;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in update discount: ${message}`,
        'DiscountService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async update(dto: UpdateDiscountDto, discountId: string) {
    try {
      this.logger.info(
        `🔄 Updating discount with ID: ${discountId}`,
        'DiscountService',
      );

      const existingDiscount = await this.findOne(discountId);

      if (dto.code !== existingDiscount.code) {
        await this.checkUniqueCode(dto.code, discountId);
      }

      if (dto.startsAt || dto.expiresAt) {
        const startsAt =
          dto.startsAt || existingDiscount.startsAt.toISOString();
        const expiresAt =
          dto.expiresAt || existingDiscount.expiresAt.toISOString();
        this.checkDate(startsAt, expiresAt);
      }

      if (dto.type || dto.value) {
        const type = dto.type || existingDiscount.type;
        const value = dto.value ? dto.value : Number(existingDiscount.value);
        this.checkValue(type, value, dto.maxAmount, dto.minOrderAmount);
      }

      const discount = await this.prisma.master.discount.update({
        where: { id: discountId },
        data: {
          ...dto,
          ...(dto.startsAt && { startsAt: new Date(dto.startsAt) }),
          ...(dto.expiresAt && { expiresAt: new Date(dto.expiresAt) }),
        },
        include: {
          users: true,
          products: true,
          categories: true,
        },
      });

      this.logger.info(
        `✅ Discount updated successfully: ${discountId}`,
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
        `❌ Unexpected error in update discount: ${message}`,
        'DiscountService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async softDelete(discountId: string) {
    try {
      this.logger.info(
        `🪓 Deleting discount with ID: ${discountId}`,
        'DiscountService',
      );

      const discount = await this.changeStatus(discountId, 'DELETE');

      this.logger.info(
        `✅ Discount removed successfully: ${discountId}`,
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
        `❌ Unexpected error in soft delete discount: ${message}`,
        'DiscountService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async restore(discountId: string) {
    try {
      this.logger.info(
        `🧩 Restore discount with ID: ${discountId}`,
        'DiscountService',
      );

      const discount = await this.changeStatus(discountId, 'RESTORE');

      this.logger.info(
        `✅ Discount restored successfully: ${discountId}`,
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
        `❌ Unexpected error in restore discount: ${message}`,
        'DiscountService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  private async changeStatus(
    discountId: string,
    operation: 'DELETE' | 'RESTORE',
  ) {
    await this.findOne(discountId, true);

    const isDelete = operation === 'DELETE';

    const discount = await this.prisma.master.discount.update({
      where: { id: discountId },
      data: {
        deletedAt: isDelete ? new Date() : null,
        isDeleted: isDelete,
        ...(operation === 'RESTORE' && { status: DiscountStatus.ACTIVE }),
      },
    });

    return discount;
  }

  private checkDate(startAtDate: string, expiresAtDate: string) {
    const startsAt = new Date(startAtDate);
    const expiresAt = new Date(expiresAtDate);
    if (startsAt >= expiresAt || expiresAt < new Date()) {
      this.logger.warn(
        `Start date must be before expiry date.`,
        'DiscountService',
      );
      throw new BadRequestException('Invalid date range.');
    }

    return {
      startsAt,
      expiresAt,
    };
  }

  private checkValue(
    type: DiscountType = DiscountType.PERCENTAGE,
    value: number,
    maxAmount?: number,
    minOrderAmount?: number,
  ) {
    if (value <= 0) {
      throw new BadRequestException('Discount value must be greater than 0.');
    }

    if (type === DiscountType.PERCENTAGE && value > 100) {
      throw new BadRequestException(
        'Percentage discount value cannot exceed 100.',
      );
    }

    if (maxAmount && minOrderAmount && maxAmount < minOrderAmount) {
      throw new BadRequestException(
        'Max amount cannot be less than min order amount.',
      );
    }
  }
}
