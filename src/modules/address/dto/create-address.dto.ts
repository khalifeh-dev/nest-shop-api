import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsPhoneNumber,
  Length,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAddressDto {
  @ApiProperty({
    example: 'Home',
    minLength: 2,
    maxLength: 50,
  })
  @IsNotEmpty()
  @IsString()
  @Length(2, 50)
  @Transform(({ value }) => value?.trim())
  title

  @ApiProperty({
    example: 'AmirMohammad',
    minLength: 3,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 100)
  @Transform(({ value }) => value?.trim())
  firstName

  @ApiProperty({
    example: 'Khalifeh',
    minLength: 3,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 100)
  @Transform(({ value }) => value?.trim())
  lastName

  @ApiProperty({
    example: '09226941242',
    minLength: 11,
    maxLength: 11,
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^09[0-9]{9}$/)
  @Transform(({ value }) => value?.trim())
  phone

  @ApiProperty({
    example: 'West Azarbaijan',
    minLength: 2,
    maxLength: 50,
  })
  @IsNotEmpty()
  @IsString()
  @Length(2, 50)
  @Transform(({ value }) => value?.trim())
  province

  @ApiProperty({
    example: 'Urmia',
    minLength: 2,
    maxLength: 50,
  })
  @IsNotEmpty()
  @IsString()
  @Length(2, 50)
  @Transform(({ value }) => value?.trim())
  city

  @ApiProperty({
    example: 'Al-Mahdi Street, Reyhan-Abad, Mokhaberat Intersection, Shoora Alley No. 26',
    minLength: 10,
    maxLength: 500,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  address

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

  @ApiProperty({
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  isDefault: boolean = true;
}