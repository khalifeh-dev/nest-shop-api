import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'Electronics',
    description: 'Category name (unique, 2-64 characters)',
    minLength: 2,
    maxLength: 64,
  })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  name;

  @ApiProperty({
    example: 'electronics',
    description: 'Category slug (unique, auto-generated if not provided)',
    required: false,
    pattern: '^[a-z0-9-]+$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug can only contain lowercase letters, numbers, and hyphens',
  })
  @Transform(({ value }) => value?.toLowerCase().trim().replace(/\s+/g, '-'))
  slug;

  @ApiProperty({
    example: 'All electronic devices and accessories',
    description: 'Category description',
    required: false,
    maxLength: 256,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description;

}
