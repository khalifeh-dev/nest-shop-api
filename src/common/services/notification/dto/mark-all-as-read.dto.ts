import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class MarkAllAsReadDto {
  @ApiProperty({ example: true, description: 'Mark As Read' })
  @IsOptional()
  @IsBoolean()
  markAll?: boolean = true;
}
