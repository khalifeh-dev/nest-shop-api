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

@Injectable()
export class DiscountService {
  constructor(
    private prisma: DatabaseService,
    @Inject('LoggerService') private logger: LoggerService,
    private userService: UserService,
  ) {}

  public async createForUser() {
    try {


        
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
