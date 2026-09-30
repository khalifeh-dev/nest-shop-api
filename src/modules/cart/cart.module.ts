import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { UserModule } from '../user/user.module';
import { ProductModule } from '../product/product.module';
import { DiscountModule } from '../discount/discount.module';

@Module({
  imports: [UserModule, ProductModule, DiscountModule],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
