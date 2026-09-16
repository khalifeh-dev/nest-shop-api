import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateCartDto } from './dto/create-cart.dto';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('cart')
@ApiTags('Carts')
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @ApiOperation({ summary: 'Create or get user cart (with guest cart merge)' })
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: CreateCartDto, required: false })
  public async createCart(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateCartDto,
  ) {
    const cart = await this.cartService.createCart(userId, dto.guestCartId);

    return cart;
  }

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add product to cart' })
  public async addItem(
    @CurrentUser('sub') userId: string,
    @Body() dto: AddItemDto,
  ) {
    return this.cartService.addItem(userId, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update cart item (quantity or selected)' })
  public async updateItem(
    @CurrentUser('sub') userId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(userId, itemId, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  public async removeItem(
    @CurrentUser('sub') userId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.cartService.removeItem(userId, itemId);
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all items from cart' })
  public async clearCart(@CurrentUser('sub') userId: string) {
    return this.cartService.clearCart(userId);
  }

  @Delete('clear-selected')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear selected items from cart' })
  public async clearSelectedItems(@CurrentUser('sub') userId: string) {
    return this.cartService.clearSelectedItems(userId);
  }
}
