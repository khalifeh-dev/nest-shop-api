import { PartialType } from '@nestjs/mapped-types';
import { CreateNotificationDto } from './create-notification.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { NotificationStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNotificationsDto extends PartialType(CreateNotificationDto) {
  @ApiProperty({ example: NotificationStatus.PENDING, description: 'Status' })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;
}
