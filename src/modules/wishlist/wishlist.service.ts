import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { ErrorUtil } from '../../common/utils/error.util';
import { UserService } from '../user/user.service';
import { ProductService } from '../product/product.service';

@Injectable()
export class WishlistService {
  constructor(
    private prisma: DatabaseService,
    private userService: UserService,
    private productService: ProductService,
  ) {}

  public async addToWishList(productId: string, userId: string) {
    try {
      await Promise.all([
        this.userService.secureFindOne(userId),
        this.productService.findOne(productId),
      ]);

      const wishlist = await this.prisma.master.wishlist.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });

      const item = await this.prisma.master.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId,
        },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              images: true,
              stock: true,
            },
          },
        },
      });

      return item;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }
}
