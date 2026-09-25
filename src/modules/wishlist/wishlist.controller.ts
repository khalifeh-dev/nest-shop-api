import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';

@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  public async addToWishList() {
    // return this.wishlistService.addToWishList()
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
