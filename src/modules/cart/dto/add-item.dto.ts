import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AddItemDto {
  @ApiProperty({
    example: 'prod-123',
    description: 'Product ID',
  })
  @IsNotEmpty()
  @IsString()
  productId;

  @ApiProperty({
    example: 2,
    description: 'Quantity (1-100)',
    minimum: 1,
    maximum: 100,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  quantity;
}
