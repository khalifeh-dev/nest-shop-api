import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class DeviceDto {
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
