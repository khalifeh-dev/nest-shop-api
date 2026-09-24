import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { ErrorUtil } from '../../common/utils/error.util';
import type { LoggerService } from '../../common/services/logger/logger-options.interface';
import { CreateAddressDto } from './dto/create-address.dto';
import { UserService } from '../user/user.service';
import { UpdateAddressDto } from './dto/update-address.dto';
import { GetAddressesDto } from './dto/get-address.dto';

@Injectable()
export class AddressService {
  constructor(
    private prisma: DatabaseService,
    @Inject('LoggerService') private logger: LoggerService,
    private userService: UserService,
  ) {}

  public async create(dto: CreateAddressDto, userId: string) {
    try {
      this.logger.info(
        `🧩 Creating address for user: ${userId}`,
        'AddressService',
      );

      await this.userService.secureFindOne(userId);

      const existingAddress = await this.prisma.replica.address.findFirst({
        where: {
          userId,
          title: dto.title,
        },
      });

      if (existingAddress) {
        this.logger.warn(
          `You already have an address with title "${dto.title}".`,
          'AddressService',
        );
        throw new ConflictException(
          `You already have an address with title "${dto.title}".`,
        );
      }
      const addressCount = await this.prisma.replica.address.count({
        where: { userId },
      });

      if (addressCount >= 10) {
        this.logger.warn(
          `You can only have up to 10 addresses. Please delete an old one first.`,
          'AddressService',
        );
        throw new BadRequestException(
          'You can only have up to 10 addresses. Please delete an old one first.',
        );
      }
      const shouldBeDefault = dto.isDefault || addressCount === 0;
      const address = await this.prisma.master.$transaction(async (tx) => {
        if (shouldBeDefault) {
          await tx.address.updateMany({
            where: { userId },
            data: { isDefault: false },
          });
        }

        const newAddress = await tx.address.create({
          data: {
            userId,
            title: dto.title,
            fullname: `${dto.firstName} ${dto.lastName}`,
            phone: dto.phone,
            province: dto.province,
            city: dto.city,
            address: dto.address,
            postalCode: dto.postalCode,
            isDefault: shouldBeDefault,
          },
        });

        return newAddress;
      });

      this.logger.info(
        `✅ Address created successfully: ${address.id} for user: ${userId}`,
        'AddressService',
      );

      return address;
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

  public async setDefault(addressId: string, userId: string) {
    try {
      this.logger.info(
        `⭐ Setting default address: ${addressId} for user: ${userId}`,
        'AddressService',
      );

      const address = await this.prisma.replica.address.findFirst({
        where: { id: addressId, userId },
      });

      if (!address) {
        this.logger.warn(
          `Address with ID ${addressId} not found.`,
          'AddressService',
        );
        throw new NotFoundException(`Address with ID ${addressId} not found.`);
      }

      const updatedAddress = await this.prisma.master.$transaction(
        async (tx) => {
          await tx.address.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
          });

          return tx.address.update({
            where: { id: addressId },
            data: { isDefault: true },
          });
        },
      );

      this.logger.info(
        `✅ Default address changed: ${addressId}`,
        'AddressService',
      );

      return updatedAddress;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in set default address: ${message}`,
        'AddressService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async update(dto: UpdateAddressDto, addressId, userId: string) {
    try {
      this.logger.info(`🔄️ Update user: ${userId} address`, 'AddressService');

      await this.userService.secureFindOne(userId);
      const existingAddress = await this.findOne(addressId, userId);

      if (dto.title !== existingAddress?.title) {
        const duplicateTitle = await this.prisma.replica.address.findFirst({
          where: {
            userId,
            title: dto.title,
            id: { not: addressId },
          },
        });

        if (duplicateTitle) {
          throw new ConflictException(
            `You already have an address with title "${dto.title}".`,
          );
        }
      }

      const address = await this.prisma.master.$transaction(async (tx) => {
        if (dto.isDefault) {
          await tx.address.updateMany({
            where: {
              userId,
              id: { not: addressId },
              isDefault: true,
            },
            data: { isDefault: false },
          });
        }

        const updatedAddress = await tx.address.update({
          where: { id: addressId },
          data: { ...dto },
        });

        return updatedAddress;
      });

      this.logger.info(
        `✅ Address updated successfully: ${addressId}`,
        'AddressService',
      );

      return address;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in update address: ${message}`,
        'AddressService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async findOne(userId: string, addressId) {
    try {
      this.logger.info(`🔍 Find user: ${userId} address`, 'AddressService');

      const address = await this.prisma.replica.address.findUnique({
        where: { id: addressId, userId },
      });

      this.logger.info(`✅ Found user address successfuly`, 'AddressService');

      return address;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in find one address: ${message}`,
        'AddressService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async remove(addressId: string, userId: string) {
    try {
      this.logger.info(`🪓 Remove user: ${userId} address`, 'AddressService');

      await this.userService.secureFindOne(userId);
      const existingAddress = await this.findOne(addressId, userId);

      const activeOrderCount = await this.prisma.replica.order.count({
        where: {
          addressId,
          status: {
            in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'],
          },
        },
      });

      if (activeOrderCount > 0) {
        this.logger.warn(
          `Cannot delete address. It is used in ${activeOrderCount} active order(s).`,
          'AddressService',
        );
        throw new BadRequestException(
          `Cannot delete address. It is used in ${activeOrderCount} active order(s).`,
        );
      }

      const result = await this.prisma.master.$transaction(async (tx) => {
        const deletedAddress = await tx.address.delete({
          where: { id: addressId },
        });

        if (existingAddress?.isDefault) {
          const anotherAddress = await tx.address.findFirst({
            where: {
              userId,
              id: { not: addressId },
            },
            orderBy: {
              createdAt: 'desc',
            },
          });

          if (anotherAddress) {
            await tx.address.update({
              where: { id: anotherAddress.id },
              data: { isDefault: true },
            });

            this.logger.info(
              `⭐ Set address ${anotherAddress.id} as default after deletion`,
              'AddressService',
            );
          } else {
            this.logger.warn(
              `⚠️ No other address available for user: ${userId}`,
              'AddressService',
            );
          }
        }

        return deletedAddress;
      });

      this.logger.info(
        `✅ Address removed successfully: ${addressId}`,
        'AddressService',
      );

      return {
        success: true,
        message: 'Address removed successfully.',
        wasDefault: existingAddress?.isDefault,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in remove address: ${message}`,
        'AddressService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async findAll(userId: string, filters?: GetAddressesDto) {
    try {
      this.logger.info(
        `🔍 Finding all addresses for user: ${userId}`,
        'AddressService',
      );

      await this.userService.secureFindOne(userId);

      const where: any = { userId };

      if (filters?.isDefault) {
        where.isDefault = filters.isDefault;
      }

      if (filters?.province) {
        where.province = filters.province;
      }

      if (filters?.city) {
        where.city = filters.city;
      }

      if (filters?.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { fullname: { contains: filters.search, mode: 'insensitive' } },
          { address: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const addresses = await this.prisma.replica.address.findMany({
        where,
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });

      const total = addresses.length;
      const defaultAddress = addresses.find((a) => a.isDefault);
      const hasDefault = !!defaultAddress;

      return {
        data: addresses,
        meta: {
          total,
          maxAllowed: 10,
          remaining: 10 - total,
          hasDefault,
          defaultAddressId: defaultAddress?.id || null,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in find all addresses: ${message}`,
        'AddressService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }
}
