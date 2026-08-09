import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  Length,
} from 'class-validator';
import { TicketCategory, TicketPriority } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({
    example: 'write ticket',
    description: 'Ticket Title',
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 128)
  title;

  @ApiProperty({
    example: 'I write a ticket title',
    description: 'Ticket Description',
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 4096)
  description;

  @ApiProperty({
    example: TicketCategory.GENERAL,
    description: 'Ticket Category',
    enum: TicketCategory,
  })
  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory = TicketCategory.GENERAL;

  @ApiProperty({
    example: TicketPriority.MEDIUM,
    description: 'Ticket Priority',
    enum: TicketPriority,
  })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority = TicketPriority.MEDIUM;

  @ApiProperty({
    examples: ['test-1', 'test-2', 'test-3', 'test-4'],
    description: 'Ticket Tags',
    example: 'test-1',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[] = [];

  @IsOptional()
  attachments?;

  @ApiProperty({
    example: '',
    description: 'Ticket User ID',
  })
  @IsNotEmpty()
  userId;

  @ApiProperty({
    example: '',
    description: 'Ticket Reply To',
  })
  @IsOptional()
  replyTo;
}
