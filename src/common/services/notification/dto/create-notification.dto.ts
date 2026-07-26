import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  IsDateString,
  IsUrl,
  Length,
  IsNotEmpty,
} from 'class-validator';
import {
  NotificationType,
  NotificationPriority,
  NotificationStatus,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ example: 'Test Title', description: 'Title' })
  @IsNotEmpty()
  @IsString()
  @Length(5, 256)
  @Transform(({ value }) => value.trim())
  title;

  @ApiProperty({ example: 'Test Message', description: 'Message' })
  @IsNotEmpty()
  @IsString()
  @Length(5, 256)
  @Transform(({ value }) => value.trim())
  message;

  @ApiProperty({ example: 'Test Content', description: 'Content' })
  @IsOptional()
  @IsObject()
  @Transform(({ value }) => value.trim())
  content?: Record<string, any>;

  @ApiProperty({ example: NotificationType.SYSTEM, description: 'Type' })
  @IsNotEmpty()
  @IsEnum(NotificationType)
  @Transform(({ value }) => value.trim())
  type?: NotificationType;

  @ApiProperty({
    example: NotificationPriority.MEDIUM,
    description: 'Priority',
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  @Transform(({ value }) => value.trim())
  priority?: NotificationPriority = NotificationPriority.MEDIUM;

  @ApiProperty({ example: '', description: 'User ID' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value.trim())
  userId?: string;

  @ApiProperty({ example: '', description: 'Order ID' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value.trim())
  orderId?: string;

  @ApiProperty({ example: '', description: 'Product ID' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value.trim())
  productId?: string;

  @ApiProperty({ example: false, description: 'Is Broadcast' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value.trim())
  isBroadcast?: boolean = false;

  @ApiProperty({ example: 'Unknown', description: 'Target Audience' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value.trim())
  targetAudience?: string;

  @ApiProperty({ example: NotificationStatus.PENDING, description: 'Status' })
  @IsOptional()
  @IsEnum(NotificationStatus)
  @Transform(({ value }) => value.trim())
  status?: NotificationStatus = NotificationStatus.PENDING;

  @ApiProperty({ example: 'today', description: 'Scheduled For' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value.trim())
  scheduledFor?: string;

  @ApiProperty({ example: '<svg></svg>', description: 'Icon' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value.trim())
  icon?: string;

  @ApiProperty({ example: 'https://abc.abc', description: 'Link' })
  @IsOptional()
  @IsUrl()
  @Transform(({ value }) => value.trim())
  link?: string;
}
