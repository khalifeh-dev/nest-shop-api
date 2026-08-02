import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['title'] as const),
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
}