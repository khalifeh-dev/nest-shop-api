import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class SignInDto {
  @ApiProperty({ example: 'owner@example.com', description: 'Owner Email' })
  @IsNotEmpty()
  @IsString()
  @Length(8, 64)
  @IsEmail()
  @Transform(({ value }) => value.trim())
  email;

  @ApiProperty({
    example: 'Admin@123456',
    type: 'string',
    description: 'Owner Password',
  })
  @IsNotEmpty()
  @IsString()
  @Length(8, 64)
  @Transform(({ value }) => value.trim())
  password;
}
