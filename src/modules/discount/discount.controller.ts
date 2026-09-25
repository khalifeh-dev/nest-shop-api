import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { DiscountService } from './discount.service';
import {
  CreateDiscountForAllUsersDto,
  CreateDiscountForGroupDto,
  CreateDiscountForUserDto,
  UpdateDiscountDto,
} from './dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('discount')
export class DiscountController {
  constructor(private readonly discountService: DiscountService) {}

  @Post('special-user')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create discount for a user' })
  public async createForUser(@Body() dto: CreateDiscountForUserDto) {
    return await this.discountService.createForUser(dto);
  }

  @Post('all-users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create discount for all user' })
  public async createForAllUsers(@Body() dto: CreateDiscountForAllUsersDto) {
    return await this.discountService.createForUsers(dto);
  }

  @Post('group')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create discount for group' })
  public async createForGroup(@Body() dto: CreateDiscountForGroupDto) {
    return await this.discountService.createForGroup(dto);
  }

  @Get(':code')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Find discount with code' })
  public async findDiscountCode(@Param('code') code: string) {
    return await this.discountService.checkUniqueCode(code);
  }

  @Get(':id')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Find discount with code' })
  public async update(
    @Body() dto: UpdateDiscountDto,
    @Param('id') discountId: string,
  ) {
    return await this.discountService.update(dto, discountId);
  }
}
