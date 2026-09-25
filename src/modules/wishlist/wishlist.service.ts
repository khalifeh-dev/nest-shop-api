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

  public async getWishList(userId: string, limit: number = 20, page: number = 1) {
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
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }
}
