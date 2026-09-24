import { PartialType } from '@nestjs/swagger';
import { CreateDiscountForAllUsersDto } from './create-discount-for-all-users.dto';

export class UpdateDiscountDto extends PartialType(CreateDiscountForAllUsersDto) {}