import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  Length,
} from 'class-validator';
import { TicketCategory, TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 128)
  title

  @IsString()
  @IsNotEmpty()
  @Length(10, 4096)
  description

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory = TicketCategory.GENERAL;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority = TicketPriority.MEDIUM;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[] = [];

  @IsOptional()
  attachments?;
}