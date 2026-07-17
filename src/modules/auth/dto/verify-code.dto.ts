import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyCodeDto {
  @ApiProperty({ example: 'owner@example.com', description: 'Owner Email' })
  @IsNotEmpty()
  @IsString()
  @Length(8, 64)
  @IsEmail()
  @Transform(({ value }) => value.trim())
  email;

  @ApiProperty({ example: '123456', description: 'Verify Code' })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  @Transform(({ value }) => value.trim())
  code;
}
