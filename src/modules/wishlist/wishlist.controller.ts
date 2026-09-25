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
  Query,
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
  public async getAllWishList(
    @CurrentUser('sub') userId: string,
    @Query('limit') limit: number = 20,
    @Query('page') page: number = 1,
  ) {
    const result = await this.wishlistService.getAllWishList(
      userId,
      limit,
      page,
    );

    const { data: allData, limit: lim, page: pg, total, pages } = result;

    return {
      data: allData,
      pagination: {
        page: pg,
        limit: lim,
        total,
        pages,
        hasNext: pg < pages,
        hasPrev: pg > 1,
        nextPage: pg < pages ? pg + 1 : null,
        prevPage: pg > 1 ? pg - 1 : null,
      },
    };
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  public async removeFromWishList(
    @CurrentUser('sub') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.removeFromWishList(userId, productId)
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  public async clearWishList(@CurrentUser('sub') userId: string) {
    return this.wishlistService.clearWishList(userId)
  }
}
