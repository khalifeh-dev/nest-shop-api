import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class ReplyTicketDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  title;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(5000)
  description;

  @IsOptional()
  attachments?: any;

  @IsOptional()
  @IsUUID()
  replyToId?: string;
}
