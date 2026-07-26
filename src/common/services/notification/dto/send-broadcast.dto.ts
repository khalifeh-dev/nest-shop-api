// src/modules/notification/dto/send-broadcast.dto.ts
import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  IsNotEmpty,
  Length,
  IsUrl,
} from 'class-validator';
import { NotificationType, NotificationPriority } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class SendBroadcastDto {
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

  @ApiProperty({ example: 'Unknown', description: 'Target Audience' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value.trim())
  targetAudience?: string;

  @ApiProperty({ example: [''], description: "Custom User ID's" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customUserIds?: string[];

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
