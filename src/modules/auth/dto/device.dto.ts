import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { SignInDto } from './sign-in.dto';
import { SignUpDto } from './sign-up.dto';

export class DeviceDto extends PartialType(SignInDto && SignUpDto) {
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  userAgent;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  ip;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  deviceName;

  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  deviceType;
}
