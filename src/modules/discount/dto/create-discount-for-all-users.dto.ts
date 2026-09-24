import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  IsDateString,
  IsBoolean,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { DiscountType, DiscountScope } from '@prisma/client';

export class CreateDiscountForAllUsersDto {
  @ApiProperty({ example: 'WELCOME1404' })
  @IsNotEmpty()
  @IsString()
  @Length(3, 50)
  @Transform(({ value }) => value?.trim().toUpperCase())
  code;

  @ApiProperty({ example: 'Welcome discount' })
  @IsNotEmpty()
  @IsString()
  @Length(3, 100)
  @Transform(({ value }) => value?.trim())
  title;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  @Transform(({ value }) => value?.trim())
  description?;

  @ApiProperty({ enum: DiscountType, default: DiscountType.PERCENTAGE })
  @IsOptional()
  @IsEnum(DiscountType)
  type?: DiscountType = DiscountType.PERCENTAGE;

  @ApiProperty({ enum: DiscountScope, default: DiscountScope.ALL_PRODUCTS })
  @IsOptional()
  @IsEnum(DiscountScope)
  scope?: DiscountScope = DiscountScope.ALL_PRODUCTS;

  @ApiProperty({ example: 10 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minOrderAmount?: number;

  @ApiProperty({ required: false, default: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimit?: number = 1000;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  perUserLimit?: number = 1;

  @ApiProperty({ example: '2026-09-01T00:00:00Z' })
  @IsNotEmpty()
  @IsDateString()
  startsAt;

  @ApiProperty({ example: '2026-12-31T23:59:59Z' })
  @IsNotEmpty()
  @IsDateString()
  expiresAt;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isFirstOrder?: boolean = false;
}
