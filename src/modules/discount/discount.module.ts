import { Module } from '@nestjs/common';
import { DiscountService } from './discount.service';
import { DiscountController } from './discount.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  controllers: [DiscountController],
  providers: [DiscountService],
})
export class DiscountModule {}
