import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Match } from '../../../common/decorators/match.decorator';

export class CreateUserDto {
  @ApiProperty({
    examples: ['AmirMohammad', 'Son', 'Aizen', 'Madara'],
    description: 'User Test First Name',
    example: 'AmirMohammad',
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 32)
  @Transform(({ value }) => value?.trim())
  firstName;

  @ApiProperty({
    examples: ['Vector', 'Goku', 'Sosuke', 'Uchiha'],
    description: 'User Test Last Name',
    example: 'Vector',
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 32)
  @Transform(({ value }) => value?.trim())
  lastName;

  @ApiProperty({
    examples: [
      'khalifeh.dev@gmail.com',
      'goku@gmail.com',
      'aizen@aizen.ir',
      'madara@uchiha.com',
    ],
    description: 'User Test Email',
    example: 'khalifeh.dev@gmail.com',
  })
  @IsNotEmpty()
  @IsString()
  @Length(8, 64)
  @IsEmail()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email;

  @ApiProperty({
    examples: ['qwertyuiop', 'asdfghjkl', 'zxcvbnmplm', 'qazxswedc'],
    description: 'User Test Password',
    example: 'qwertyuiop',
  })
  @IsNotEmpty()
  @IsString()
  @Length(8, 64)
  @Transform(({ value }) => value?.trim())
  password;

  @ApiProperty({
    examples: ['qwertyuiop', 'asdfghjkl', 'zxcvbnmplm', 'qazxswedc'],
    description: 'User Test Confirm Password',
    example: 'qwertyuiop',
  })
  @IsNotEmpty()
  @IsString()
  @Length(8, 64)
  @Transform(({ value }) => value?.trim())
  @Match('password')
  confirmPassword;
}
