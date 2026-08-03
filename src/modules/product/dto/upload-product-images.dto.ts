import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsNumber, Min, Max, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadProductImagesDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    minItems: 1,
    maxItems: 10,
    description: 'Product images (max 10 files, min 1 file)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  images

  @ApiProperty({
    example: 1,
    description: 'Minimum number of images required',
    required: false,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => Number(value))
  minImages?: number = 1;

  @ApiProperty({
    example: 10,
    description: 'Maximum number of images allowed',
    required: false,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Max(10)
  @Transform(({ value }) => Number(value))
  maxImages?: number = 10;
}