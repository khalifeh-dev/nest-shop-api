import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import type { LoggerService } from '../../common/services/logger/logger-options.interface';
import { ErrorUtil } from '../../common/utils/error.util';
import { UserService } from '../user/user.service';
import { CartStatus } from '@prisma/client';
import { ProductService } from '../product/product.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    private prisma: DatabaseService,
    private userService: UserService,
    private productService: ProductService,
    @Inject('LoggerService') private logger: LoggerService,
  ) {}

  public async createCart(userId: string, guestCartId?: string) {
    try {
      this.logger.info(
        `🛒 Creating/Getting cart for user: ${userId}`,
        'CartService',
      );

      await this.userService.secureFindOne(userId);

      let userCart = await this.getOrCreateActiveCart(userId);

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
        'CartService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async addItem(userId: string, dto: AddItemDto) {
    try {
      this.logger.info(
        `🛒 Adding product ${dto.productId} to cart for user: ${userId}`,
        'CartService',
      );

      await this.userService.secureFindOne(userId);
      const product = await this.productService.findOne(dto.productId);

      if (product.stock < dto.quantity) {
        this.logger.warn(
          `Insufficient stock. Available: ${product.stock}, Requested: ${dto.quantity}`,
          'CartService',
        );
        throw new BadRequestException(
          `Insufficient stock. Available: ${product.stock}, Requested: ${dto.quantity}`,
        );
      }

      const cart = await this.getOrCreateActiveCart(userId);

      const existingItem = cart.items.find(
        (item) => item.productId === dto.productId,
      );

      const updatedCart = await this.prisma.transaction(async (tx) => {
        if (existingItem) {
          const newQuantity = existingItem.quantity + dto.quantity;

          if (newQuantity > product.stock) {
            this.logger.warn(
              `Cannot add more. Total would be ${newQuantity}, but only ${product.stock} available.`,
              'CartService',
            );
            throw new BadRequestException(
              `Cannot add more. Total would be ${newQuantity}, but only ${product.stock} available.`,
            );
          }

          await tx.cartItem.update({
            where: { id: existingItem.id },
            data: {
              quantity: newQuantity,
              total: Number(product.price) * newQuantity,
            },
          });

          this.logger.debug(
            `🔄 Updated item ${dto.productId}: ${existingItem.quantity} → ${newQuantity}`,
            'CartService',
          );
        } else {
          await tx.cartItem.create({
            data: {
              cartId: cart.id,
              productId: dto.productId,
              quantity: dto.quantity,
              price: product.price,
              discount: 0,
              total: Number(product.price) * dto.quantity,
              selected: true,
            },
          });

          this.logger.debug(
            `➕ Added new item ${dto.productId} to cart`,
            'CartService',
          );
        }

        await this.recalculateCartTotals(cart.id, tx);

        return tx.cart.findUnique({
          where: { id: cart.id },
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
                  },
                },
              },
            },
          },
        });
      });

      this.logger.info(`✅ Product added to cart successfully`, 'CartService');

      return updatedCart;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in add item user: ${message}`,
        'CartService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async updateItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ) {
    try {
      this.logger.info(
        `✏️ Updating cart item ${itemId} for user: ${userId}`,
        'CartService',
      );

      const cartItem = await this.prisma.replica.cartItem.findFirst({
        where: {
          id: itemId,
          cart: {
            userId,
            status: CartStatus.ACTIVE,
          },
        },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              stock: true,
              isActive: true,
            },
          },
          cart: true,
        },
      });

      if (!cartItem) {
        throw new NotFoundException(
          `Cart item with ID ${itemId} not found in your active cart.`,
        );
      }

      if (!cartItem.product.isActive) {
        throw new BadRequestException('Product is not active.');
      }

      if (dto.quantity !== undefined) {
        if (dto.quantity < 1) {
          throw new BadRequestException('Quantity must be at least 1.');
        }

        if (dto.quantity > cartItem.product.stock) {
          throw new BadRequestException(
            `Insufficient stock. Available: ${cartItem.product.stock}, Requested: ${dto.quantity}`,
          );
        }
      }

      const updatedCart = await this.prisma.master.$transaction(async (tx) => {
        const updateData: any = {};

        if (dto.quantity) {
          updateData.quantity = dto.quantity;
          updateData.total = Number(cartItem.product.price) * dto.quantity;
        }

        if (dto.selected) updateData.selected = dto.selected;

        if (Object.keys(updateData).length === 0) {
          throw new BadRequestException('No valid fields to update.');
        }

        await tx.cartItem.update({
          where: { id: itemId },
          data: updateData,
        });

        await this.recalculateCartTotals(cartItem.cartId, tx);

        return tx.cart.findUnique({
          where: { id: cartItem.cartId },
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
                  },
                },
              },
            },
          },
        });
      });

      this.logger.info(
        `✅ Cart item updated successfully: ${itemId}`,
        'CartService',
      );

      return updatedCart;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in update item user: ${message}`,
        'CartService',
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

  private async getOrCreateActiveCart(userId: string, tx?: any): Promise<any> {
    const prismaClient = tx || this.prisma.master;

    let cart = await this.prisma.replica.cart.findFirst({
      where: {
        userId,
        status: CartStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    if (!cart) {
      await prismaClient.cart.updateMany({
        where: {
          userId,
          status: CartStatus.ACTIVE,
        },
        data: {
          status: CartStatus.MERGED,
        },
      });

      cart = await prismaClient.cart.create({
        data: {
          userId,
          status: CartStatus.ACTIVE,
        },
        include: { items: true },
      });

      this.logger.info(`✅ Cart created for user: ${userId}`, 'CartService');
    }

    return cart;
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
