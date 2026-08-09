import {
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  IsUUID,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  //   @IsOptional()
  //   @IsUUID()
  //   assignedToId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}
