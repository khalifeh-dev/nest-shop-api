import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsInt,
  Min,
  IsOptional,
  IsNotEmpty,
  Length,
} from 'class-validator';

export class CreateCommentDto {
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

  @ApiProperty({
    example: '',
    description: 'Product ID',
  })
  @IsNotEmpty()
  @IsString()
  @Min(0)
  @Transform(({ value }) => value?.trim())
  productId;

  @ApiProperty({
    example: '',
    description: 'Parent ID',
  })
  @IsOptional()
  @IsString()
  @Min(0)
  @Transform(({ value }) => value?.trim())
  parentId?: string;
}
