import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsBoolean,
  ArrayMinSize,
  IsString,
} from 'class-validator';

export class MarkAsReadDto {
  @ApiProperty({ example: [], description: "Notification ID's" })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  notificationIds;

  @ApiProperty({ example: true, description: 'Is Read' })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean = true;
}
