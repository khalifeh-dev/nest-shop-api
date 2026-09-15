import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateCartDto } from './dto/create-cart.dto';

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
}
