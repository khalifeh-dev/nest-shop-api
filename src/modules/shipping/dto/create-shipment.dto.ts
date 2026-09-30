import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDecimal,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateShippingDto {
  @ApiProperty({ example: 'Shop', maxLength: 64, minLength: 2 })
  @IsNotEmpty()
  @IsString()
  @Length(2, 64)
  @Transform(({ value }) => value?.trim())
  name;

  @ApiProperty({
    example:
      'Al-Mahdi Street, Reyhan-Abad, Mokhaberat Intersection, Shoora Alley No. 26',
    minLength: 10,
    maxLength: 500,
  })
  @IsNotEmpty()
  @IsString()
  @Length(8, 512)
  @Transform(({ value }) => value?.trim())
  address;

  @ApiProperty({
    example: '09226941242',
    minLength: 11,
    maxLength: 11,
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^09[0-9]{9}$/)
  @Transform(({ value }) => value?.trim())
  phone;

  @ApiProperty({
    example: 'West Azarbaijan',
    minLength: 2,
    maxLength: 50,
  })
  @IsNotEmpty()
  @IsString()
  @Length(2, 50)
  @Transform(({ value }) => value?.trim())
  province;

  @ApiProperty({
    example: 'Urmia',
    minLength: 2,
    maxLength: 50,
  })
  @IsNotEmpty()
  @IsString()
  @Length(2, 50)
  @Transform(({ value }) => value?.trim())
  city;

  @ApiProperty({
    example: '1234567890',
    minLength: 10,
    maxLength: 10,
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]{10}$/)
  @Transform(({ value }) => value?.trim())
  postalCode;
}
