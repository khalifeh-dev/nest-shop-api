import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsString,
  IsBoolean,
  IsDateString,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  NotificationType,
  NotificationStatus,
  NotificationPriority,
} from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class GetNotificationsDto {
  @ApiProperty({ example: 20, description: 'Limit' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Length(1, 50)
  limit?: number = 20;

  @ApiProperty({ example: 1, description: 'page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: NotificationType.SYSTEM, description: 'Type' })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiProperty({ example: NotificationStatus.PENDING, description: 'Status' })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiProperty({
    example: NotificationPriority.MEDIUM,
    description: 'Priority',
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiProperty({ example: '', description: 'User ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ example: false, description: 'Is Broadcast' })
  @IsOptional()
  @IsBoolean()
  isBroadcast?: boolean;

  @ApiProperty({ example: '', description: 'Form Data' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiProperty({ example: '', description: 'To Date' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiProperty({ example: '', description: 'Search' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ example: 'createdAt', description: 'Sort By' })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'sentAt' | 'scheduledFor' | 'priority' = 'createdAt';

  @ApiProperty({ example: 'desc', description: 'Sort Order' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
