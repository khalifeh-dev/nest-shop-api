import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  public async addToWishList(
    @CurrentUser('sub') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.addToWishList(productId, userId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  public async getWishList() {
    // return this.wishlistService.getWishList()
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  public async removeFromWishList() {
    // return this.wishlistService.removeFromWishList()
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  public async clearWishList() {
    // return this.wishlistService.clearWishList()
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  public async checkInWishList() {
    // return this.wishlistService.checkInWishList()
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  public async updateWishList() {
    // return this.wishlistService.updateWishList()
  }
}
