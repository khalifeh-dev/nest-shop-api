import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsString,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, [
    'title',
    'price',
    'stock',
    'categoryIds',
  ] as const),
) {
  @ApiProperty({
    example: 'iPhone 15 Pro Max (Updated)',
    description: 'Product title (optional)',
    required: false,
  })
  @IsOptional()
  title?: string;

  @ApiProperty({
    example: true,
    description: 'Product active status',
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;

  @ApiProperty({
    example: 4.8,
    description: 'Product rating (0-5)',
    minimum: 0,
    maximum: 5,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Rating must be a number' })
  @Min(0, { message: 'Rating must be at least 0' })
  @Max(5, { message: 'Rating cannot exceed 5' })
  @Transform(({ value }) => Number(value))
  rating?: number;

  @ApiProperty({
    example: 999,
    description: 'Product price (optional)',
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(1, { message: 'Price must be at least 1' })
  @Type(() => Number)
  price?: number;

  @ApiProperty({
    example: 50,
    description: 'Product stock (optional)',
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Stock must be a number' })
  @Min(0, { message: 'Stock cannot be negative' })
  @Type(() => Number)
  stock?: number;

  @ApiProperty({
    examples: [''],
    description: 'Product categories ID',
    example: '',
  })
  @IsOptional()
  @IsString({ each: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((item) =>
        typeof item === 'string' ? item.trim() : item,
      );
    }
    return value;
  })
  categoryIds;
}
