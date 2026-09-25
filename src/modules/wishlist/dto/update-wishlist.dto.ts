import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

const trimString = ({ value }: { value: any }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateWishlistDto {
  @ApiProperty({ example: 'My Favorite' })
  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  @Transform(trimString)
  name;

  @ApiProperty({ required: false, example: 'Products I want to buy later' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  @Transform(trimString)
  description?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isDefault?: boolean = false;
}
