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
}
