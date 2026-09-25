import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { DiscountService } from './discount.service';
import {
  CreateDiscountForAllUsersDto,
  CreateDiscountForGroupDto,
  CreateDiscountForUserDto,
  GetDiscountsDto,
  UpdateDiscountDto,
} from './dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Pagination } from '../../common/types/pagination.type';
import { Discount } from '@prisma/client';

@ApiTags('Discount')
@ApiBearerAuth()
@Controller('discount')
export class DiscountController {
  constructor(private readonly discountService: DiscountService) {}

  @Post('special-user')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create discount for a user' })
  public async createForUser(@Body() dto: CreateDiscountForUserDto) {
    return this.discountService.createForUser(dto);
  }

  @Post('all-users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create discount for all user' })
  public async createForAllUsers(@Body() dto: CreateDiscountForAllUsersDto) {
    return this.discountService.createForUsers(dto);
  }

  @Post('group')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create discount for group' })
  public async createForGroup(@Body() dto: CreateDiscountForGroupDto) {
    return this.discountService.createForGroup(dto);
  }

  @Get(':code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Find discount with code' })
  public async findDiscountCode(@Param('code') code: string) {
    return this.discountService.checkUniqueCode(code);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Find discount with code' })
  public async update(
    @Body() dto: UpdateDiscountDto,
    @Param('id') discountId: string,
  ) {
    return this.discountService.update(dto, discountId);
  }

  @Patch(':id/soft-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a discount' })
  public async softDelete(@Param('id') discountId: string) {
    return this.discountService.softDelete(discountId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all discounts (admin only)' })
  public async findAll(@Query() dto: GetDiscountsDto) {
    const result = await this.discountService.findAll(dto);
    const {
      data: allData,
      limit: lim,
      page: pg,
      total,
      pages,
      ...otherData
    } = result;

    return {
      data: allData,
      pagination: {
        page: pg,
        limit: lim,
        total,
        pages,
        hasNext: pg < pages,
        hasPrev: pg > 1,
        nextPage: pg < pages ? pg + 1 : null,
        prevPage: pg > 1 ? pg - 1 : null,
      },
      otherData,
    };
  }
}
