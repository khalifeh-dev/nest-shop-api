import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsString,
  IsUUID,
  IsDateString,
  IsBoolean,
  IsIn,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TicketStatus, TicketPriority, TicketCategory } from '@prisma/client';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';

export class GetTicketsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  hasReplies?: boolean;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isDeleted?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minReplyCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxReplyCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  maxRating?: number;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsDateString()
  resolvedFrom?: string;

  @IsOptional()
  @IsDateString()
  resolvedTo?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn([
    'createdAt',
    'updatedAt',
    'priority',
    'status',
    'replyCount',
    'rating',
    'resolvedAt',
    'closedAt',
  ])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  includeUser?: boolean = true;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  includeReplies?: boolean = false;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  includeParent?: boolean = false;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  includeStats?: boolean = false;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  matchAllTags?: boolean = false;

  @IsOptional()
  @IsIn(['status', 'priority', 'category'])
  groupBy?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
