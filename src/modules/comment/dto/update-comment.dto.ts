import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsInt,
  IsNotEmpty,
  Length,
} from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({
    example: 'I write a comment',
    description: 'Comment Content',
  })
  @IsNotEmpty()
  @IsString()
  @Length(3, 1024)
  @Transform(({ value }) => value?.trim())
  content;

  @ApiProperty({
    example: '4',
    description: 'Comment Rating',
  })
  @IsNotEmpty()
  @IsInt()
  @Length(0, 5)
  @Transform(({ value }) => Number(value))
  rating;
}