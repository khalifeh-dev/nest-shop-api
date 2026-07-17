import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class ForgetPasswordDto {
  @ApiProperty({ example: 'owner@example.com', description: 'Owner Email' })
  @IsNotEmpty()
  @IsString()
  @Length(8, 64)
  @IsEmail()
  @Transform(({ value }) => value.trim())
  email;
}
