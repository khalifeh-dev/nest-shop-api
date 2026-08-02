import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    example: 'iPhone 15 Pro Max',
    description: 'Product title (3-128 characters)',
    maxLength: 128,
    minLength: 3,
  })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  title;

  @ApiProperty({
    example: 'The latest iPhone with A17 Pro chip and titanium design',
    description: 'Product description (max 256 characters)',
    maxLength: 256,
    required: false,
  })
  @IsOptional()
  @IsString({})
  @Transform(({ value }) => value?.trim())
  description;

  @ApiProperty({
    example: 999,
    description: 'Product price in dollars (minimum 1)',
    minimum: 1,
    type: 'integer',
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => Number(value))
  price;

  @ApiProperty({
    examples: [''],
    description: 'Product categories ID',
    example: '',
  })
  @IsNotEmpty()
  @IsString({ each: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
@Transform(({ value }) => {
  if (Array.isArray(value)) {
    return value.map(item => typeof item === 'string' ? item.trim() : item);
  }
  return value;
})
  categoryIds;

  @ApiProperty({
    example: 50,
    description: 'Product stock quantity (minimum 0)',
    minimum: 0,
    type: 'integer',
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  stock;

  @ApiProperty({
    example: 'Apple',
    description: 'Product brand (2-64 characters)',
    maxLength: 64,
    minLength: 2,
  })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  brand;

  @ApiProperty({
    example: 'A17 Pro',
    description: 'Product model (2-64 characters)',
    maxLength: 64,
    minLength: 2,
  })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  model;

  @ApiProperty({
    example: 10,
    description: 'Discount percentage (0-100)',
    minimum: 0,
    maximum: 100,
    default: 0,
    type: 'integer',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => Number(value || 0))
  discount?: number = 0;

  @ApiProperty({
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
    description: 'Product images',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true, message: 'Each image must be a valid URL' })
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((url: string) => url.trim());
    }
    return value;
  })
  images?: string[];
}
