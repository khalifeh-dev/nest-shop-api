import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { UpdateWishlistDto } from './update-wishlist.dto';

export class AddToWishlistsDto extends PartialType(UpdateWishlistDto) {
  @ApiProperty({ required: true, example: '' })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  productId;
}
