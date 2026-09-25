import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  IsDateString,
  IsArray,
  IsUUID,
  Min,
  Max,
  Length,
  ArrayMinSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { DiscountType, DiscountTargetType } from '@prisma/client';

const trimString = ({ value }: { value: any }) =>
  typeof value === 'string' ? value.trim() : value;

const trimAndUpper = ({ value }: { value: any }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateDiscountForGroupDto {
  @ApiProperty({ example: 'GROUP1404' })
  @IsNotEmpty()
  @IsString()
  @Length(3, 50)
  @Transform(trimString)
  code;

  @ApiProperty({ example: 'group discount' })
  @IsNotEmpty()
  @IsString()
  @Length(3, 100)
  @Transform(trimAndUpper)
  title;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  @Transform(trimAndUpper)
  description?;

  @ApiProperty({ enum: DiscountType, default: DiscountType.PERCENTAGE })
  @IsOptional()
  @IsEnum(DiscountType)
  type?: DiscountType = DiscountType.PERCENTAGE;

  @ApiProperty({ enum: DiscountTargetType })
  @IsNotEmpty()
  @IsEnum(DiscountTargetType)
  targetType?: DiscountTargetType;

  @ApiProperty({ example: 15 })
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

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimit?: number = 1;

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

  @ApiProperty({ example: ['user-1', 'user-2'], type: [String] })
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  userIds;

  @ApiProperty({ required: false, example: ['prod-1'], type: [String] })
  @IsOptional()
  @IsArray()
  productIds?: string[];

  @ApiProperty({ required: false, example: ['cat-1'], type: [String] })
  @IsOptional()
  @IsArray()
  categoryIds?: string[];
}
