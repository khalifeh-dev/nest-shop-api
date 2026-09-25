import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  IsString,
  IsBoolean,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

const trimString = ({ value }: { value: any }) =>
  typeof value === 'string' ? value.trim() : value;

export class GetWishlistsDto {
  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
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
  @Transform(trimString)
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isDefault?: boolean;

  @ApiProperty({ required: false, default: 'createdAt' })
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'name'])
  sortBy?: string = 'createdAt';

  @ApiProperty({ required: false, default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  includeItems?: boolean = true;
}