import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { CloudinaryModule } from '../../common/services/cloudinary/cloudinary.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [CloudinaryModule, UserModule],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
