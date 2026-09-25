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
import { Pagination } from '../../common/utils/pagination';
import { Wishlist } from '@prisma/client';

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
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async getAllWishList(
    userId: string,
    limit: number = 20,
    page: number = 1,
  ) {
    try {
      await this.userService.secureFindOne(userId);

      const { finalLimit, skip } = Pagination.values(limit, page);

      const [wishlist, total] = await Promise.all([
        this.prisma.replica.wishlist.findMany({
          where: { userId },
          skip,
          take: finalLimit,
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    price: true,
                    images: true,
                    stock: true,
                    isActive: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
            _count: {
              select: { items: true },
            },
          },
        }),
        this.prisma.replica.wishlist.count({ where: { userId } }),
      ]);

      const totalPages = Math.ceil(total / finalLimit);

      return {
        data: wishlist,
        limit: finalLimit,
        page,
        total,
        pages: totalPages,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async removeFromWishList(userId: string, productId: string) {
    try {
      await Promise.all([
        this.userService.secureFindOne(userId),
        this.productService.findOne(productId),
      ]);

      const wishlist = await this.findOne(userId);

      const item = await this.prisma.replica.wishlistItem.findUnique({
        where: {
          wishlistId_productId: {
            wishlistId: wishlist.id,
            productId,
          },
        },
      });

      if (!item)
        throw new NotFoundException('Product not found in your wishlist.');

      await this.prisma.master.wishlistItem.delete({
        where: { id: item.id },
      });

      return { success: true, message: 'Product removed from wishlist.' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async clearWishList(userId: string) {
    try {
      await this.userService.secureFindOne(userId);

      const wishlist = await this.findOne(userId);

      const result = await this.prisma.master.wishlistItem.deleteMany({
        where: { wishlistId: wishlist.id },
      });

      return {
        deletedCount: result.count,
        message: `${result.count} items removed from your wishlist.`,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  private async findOne(userId: string) {
    const wishlist = await this.prisma.replica.wishlist.findUnique({
      where: { userId },
    });

    if (!wishlist) throw new BadRequestException('Wishlist is already empty.');

    return wishlist;
  }
}
