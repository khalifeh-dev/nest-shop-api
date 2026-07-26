import {
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsString,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetUserNotificationsDto {
  @ApiProperty({ example: 20, description: 'Limit' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Length(1, 50)
  limit?: number = 20;

  @ApiProperty({ example: 1, description: 'Page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: false, description: 'Is Read' })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiProperty({ example: '', description: 'Type' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ example: '', description: 'Priority' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiProperty({ example: '', description: 'Sort By' })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'deliveredAt' | 'readAt' = 'createdAt';

  @ApiProperty({ example: '', description: 'Sort Order' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
