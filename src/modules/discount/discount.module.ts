import { Module } from '@nestjs/common';
import { DiscountService } from './discount.service';
import { DiscountController } from './discount.controller';
import { UserModule } from '../user/user.module';
import { CategoryModule } from '../category/category.module';
import { ProductModule } from '../product/product.module';
import { BulkValidator } from '../../common/utils/validate-bulk.util';

@Module({
  imports: [UserModule,     ProductModule,
    CategoryModule,],
  controllers: [DiscountController],
  providers: [DiscountService, BulkValidator],
})
export class DiscountModule {}
