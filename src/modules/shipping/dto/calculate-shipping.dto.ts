import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDecimal, IsNotEmpty, IsString, Length } from 'class-validator';

export class CalculateShippingDto {
  @ApiProperty({ example: 'Urmia', maxLength: 64, minLength: 2 })
  @IsNotEmpty()
  @IsString()
  @Length(2, 64)
  @Transform(({ value }) => value?.trim())
  fromCity;

  @ApiProperty({ example: 'Tehran', maxLength: 64, minLength: 2 })
  @IsNotEmpty()
  @IsString()
  @Length(2, 64)
  @Transform(({ value }) => value?.trim())
  toCity;

  @ApiProperty({ example: 313 })
  @IsNotEmpty()
  @IsDecimal()
  weight;

  @ApiProperty({ example: 5.99 })
  @IsNotEmpty()
  @IsDecimal()
  orderAmount;
}
