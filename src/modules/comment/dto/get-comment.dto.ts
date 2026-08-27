import { ApiProperty } from '@nestjs/swagger';
import { CommentStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsInt,
  Min,
  IsOptional,
  IsNotEmpty,
  Length,
  Max,
  IsEnum,
  IsBoolean,
} from 'class-validator';

export class GetCommentDto {
  @ApiProperty({
    example: 20,
    description: 'Pagination Limit',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiProperty({
    example: 1,
    description: 'Pagination Page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    example: '',
    description: 'Product ID',
  })
  @IsOptional()
  @IsString()
  @Min(0)
  @Transform(({ value }) => value?.trim())
  productId?: string;

  @ApiProperty({
    example: '',
    description: 'User ID',
  })
  @IsOptional()
  @IsString()
  @Min(0)
  @Transform(({ value }) => value?.trim())
  userId?: string;

  @ApiProperty({
    example: CommentStatus.APPROVED,
    description: 'Status',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  @IsEnum(CommentStatus)
  status?: CommentStatus;

  @ApiProperty({
    example: false,
    description: 'Has Get Replies',
  })
  @IsOptional()
  @IsBoolean()
  hasReplies?: boolean;

  @ApiProperty({
    example: 0,
    description: 'Comment Min Rating',
  })
  @IsNotEmpty()
  @IsInt()
  @Length(0, 5)
  @Transform(({ value }) => Number(value))
  minRating?: number;

  @ApiProperty({
    example: 5,
    description: 'Comment Max Rating',
  })
  @IsNotEmpty()
  @IsInt()
  @Length(0, 5)
  @Transform(({ value }) => Number(value))
  maxRating?: number;

  @ApiProperty({
    example: 'createdAt',
    description: 'Sort By',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'rating' | 'likesCount' | 'replyCount' = 'createdAt';

  @ApiProperty({
    example: 'desc',
    description: 'Sort Order',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
