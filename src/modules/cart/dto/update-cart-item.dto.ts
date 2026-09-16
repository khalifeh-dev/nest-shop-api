import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartItemDto {
  @ApiProperty({
    example: 3,
    description: 'New quantity (1-100)',
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;

  @ApiProperty({
    example: true,
    description: 'Whether the item is selected for checkout',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  selected?: boolean;
}