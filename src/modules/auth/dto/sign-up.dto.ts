import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from '../../user/dto/create-user.dto';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class SignUpDto extends PartialType(CreateUserDto) {
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
