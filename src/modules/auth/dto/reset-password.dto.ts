import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Match } from '../../../common/decorators/match.decorator';

export class resetPasswordDto {
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

  @ApiProperty({ example: 'owner@example.com', description: 'Owner Email' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(256)
  @Transform(({ value }) => value.trim())
  location;

  @ApiProperty({
    examples: ['qwertyuiop', 'asdfghjkl', 'zxcvbnmplm', 'qazxswedc'],
    description: 'User Test Password',
    example: 'qwertyuiop',
  })
  @IsNotEmpty()
  @IsString()
  @Length(8, 64)
  @Transform(({ value }) => value?.trim())
  newPassword;

  @ApiProperty({
    examples: ['qwertyuiop', 'asdfghjkl', 'zxcvbnmplm', 'qazxswedc'],
    description: 'User Test Confirm Password',
    example: 'qwertyuiop',
  })
  @IsNotEmpty()
  @IsString()
  @Length(8, 64)
  @Transform(({ value }) => value?.trim())
  @Match('newPassword')
  confirmPassword;
}
