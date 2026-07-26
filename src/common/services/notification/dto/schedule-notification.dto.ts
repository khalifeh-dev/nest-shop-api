import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class ScheduleNotificationDto {
  @ApiProperty({ example: '', description: 'Scheduled For' })
  @IsDateString()
  @IsNotEmpty()
  scheduledFor;
}
