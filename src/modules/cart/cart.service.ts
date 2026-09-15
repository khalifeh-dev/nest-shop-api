import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import type { LoggerService } from '../../common/services/logger/logger-options.interface';
import { ErrorUtil } from '../../common/utils/error.util';
import { UserService } from '../user/user.service';
import { threadId } from 'worker_threads';
import { CartStatus } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(
    private prisma: DatabaseService,
    private userService: UserService,
    @Inject('LoggerService') private logger: LoggerService,
  ) {}

  public async createCart(userId: string, guestCartId?: string) {
    try {
      this.logger.info(
        `🛒 Creating/Getting cart for user: ${userId}`,
        'CartService',
      );

      await this.userService.secureFindOne(userId);

      let userCart = await this.prisma.master.cart.findFirst({
        where: { userId, status: CartStatus.ACTIVE },
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      });

      if (!userCart) {
        await this.prisma.master.cart.updateMany({
          where: {
            userId,
            status: CartStatus.ACTIVE,
          },
          data: {
            status: CartStatus.MERGED,
          },
        });

        userCart = await this.prisma.master.cart.create({
          data: { userId, status: CartStatus.ACTIVE },
          include: { items: true },
        });
      }

      if (guestCartId) {
        await this.mergeGuestCart(userCart.id, guestCartId, userId);

        userCart = await this.prisma.replica.cart.findUnique({
          where: { id: userCart.id },
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, title: true, price: true, images: true },
                },
              },
            },
          },
        });
      }

      return userCart;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in create user: ${message}`,
        'UserService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  private async mergeGuestCart(
    userCartId: string,
    guestCartId: string,
    userId: string,
  ) {
    try {
      this.logger.info(
        `🔄 Merging guest cart ${guestCartId} into user cart ${userCartId}`,
        'CartService',
      );

      const guestCart = await this.prisma.replica.cart.findFirst({
        where: {
          OR: [{ id: guestCartId }, { guestToken: guestCartId }],
          userId: null,
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, price: true, stock: true },
              },
            },
          },
        },
      });

      if (!guestCart) {
        this.logger.warn(
          `⚠️ Guest cart ${guestCartId} not found, skipping merge`,
          'CartService',
        );

        throw new NotFoundException(
          `Guest cart ${guestCartId} not found, skipping merge`,
        );
      }

      if (guestCart.items.length === 0) {
        this.logger.warn(
          `⚠️ Guest cart ${guestCartId} is empty, deleting it`,
          'CartService',
        );
        await this.prisma.master.cart.delete({
          where: { id: guestCartId },
        });
        return;
      }

      const userCartItems = await this.prisma.replica.cartItem.findMany({
        where: { cartId: userCartId },
        select: { id: true, productId: true, quantity: true },
      });

      const userItemsMap = new Map(
        userCartItems.map((item) => [item.productId, item]),
      );

      await this.prisma.master.$transaction(async (tx) => {
        for (const guestItem of guestCart.items) {
          const existingItem = userItemsMap.get(guestItem.productId);

          if (existingItem) {
            const newQuantity = existingItem.quantity + guestItem.quantity;

            const maxQuantity = Math.min(newQuantity, guestItem.product.stock);

            await tx.cartItem.update({
              where: { id: existingItem.id },
              data: {
                quantity: maxQuantity,
                total: Number(guestItem.product.price) * maxQuantity,
              },
            });

            this.logger.debug(
              `🔄 Updated item ${guestItem.productId}: ${existingItem.quantity} → ${maxQuantity}`,
              'CartService',
            );
          } else {
            await tx.cartItem.create({
              data: {
                cartId: userCartId,
                productId: guestItem.productId,
                quantity: guestItem.quantity,
                price: guestItem.price,
                discount: guestItem.discount,
                total: guestItem.total,
                selected: guestItem.selected,
              },
            });

            this.logger.debug(
              `➕ Added item ${guestItem.productId} to user cart`,
              'CartService',
            );
          }
        }

        await tx.cart.delete({
          where: { id: guestCartId },
        });

        await this.recalculateCartTotals(userCartId, tx);
      });

      this.logger.info(
        `✅ Guest cart ${guestCartId} merged into user cart ${userCartId}`,
        'CartService',
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to merge guest cart: ${ErrorUtil.getMessage(error)}`,
        'CartService',
      );
      throw error;
    }
  }

  private async recalculateCartTotals(cartId: string, tx?: any): Promise<void> {
    const prismaClient = tx || this.prisma.master;

    const items = await prismaClient.cartItem.findMany({
      where: { cartId },
      select: { total: true, quantity: true, selected: true },
    });

    const subtotal = items
      .filter((item) => item.selected)
      .reduce((sum, item) => sum + Number(item.total), 0);

    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    await prismaClient.cart.update({
      where: { id: cartId },
      data: {
        subtotal,
        total: subtotal,
        itemCount,
      },
    });
  }
}
