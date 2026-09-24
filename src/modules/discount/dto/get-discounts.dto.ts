import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsInt,
  IsString,
  IsBoolean,
  IsDateString,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { DiscountStatus, DiscountType, DiscountScope } from '@prisma/client';

export class GetDiscountsDto {
  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiProperty({ required: false, enum: DiscountStatus })
  @IsOptional()
  @IsEnum(DiscountStatus)
  status?: DiscountStatus;

  @ApiProperty({ required: false, enum: DiscountType })
  @IsOptional()
  @IsEnum(DiscountType)
  type?: DiscountType;

  @ApiProperty({ required: false, enum: DiscountScope })
  @IsOptional()
  @IsEnum(DiscountScope)
  scope?: DiscountScope;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isFirstOrder?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiProperty({ required: false, default: 'createdAt' })
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'startsAt', 'expiresAt', 'usedCount'])
  sortBy?: string = 'createdAt';

  @ApiProperty({ required: false, default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}