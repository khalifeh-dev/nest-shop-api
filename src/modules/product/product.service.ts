import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { DatabaseService } from '../../common/database/database.service';
import type { LoggerService } from '../../common/services/logger/logger-options.interface';
import { ErrorUtil } from '../../common/utils/error.util';
import { Product } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(
    private prisma: DatabaseService,
    @Inject('LoggerService') private logger: LoggerService,
  ) {}

  public async create(dto: CreateProductDto, userId: string): Promise<Product> {
    try {
      const { categoryIds, ...productData } = dto;

      this.logger.debug(
        `📝 Creating product: ${productData.title} by user: ${userId}`,
        'ProductService',
      );

      if (categoryIds && categoryIds.length > 0) {
        const categories = await this.prisma.replica.category.findMany({
          where: {
            id: { in: categoryIds },
            isActive: true,
          },
          select: { id: true },
        });

        if (categories.length !== categoryIds.length) {
          this.logger.warn(
            `⚠️ Some categories not found: ${categoryIds}`,
            'ProductService',
          );
          throw new NotFoundException('One or more categories not found');
        }
      }

      const product = await this.prisma.transaction(async (prisma) => {
        const newProduct = await prisma.product.create({
          data: {
            title: productData.title,
            description: productData.description,
            price: productData.price,
            stock: productData.stock,
            brand: productData.brand,
            model: productData.model,
            discount: productData.discount || 0,
            rating: 0,
            userId: userId,
            images: productData.images ?? [],
            isActive: true,
          },
        });

        if (categoryIds && categoryIds.length > 0) {
          await prisma.productCategory.createMany({
            data: categoryIds.map((categoryId: string) => ({
              productId: newProduct.id,
              categoryId,
            })),
          });
        }

        return prisma.product.findUnique({
          where: { id: newProduct.id },
          include: {
            categories: {
              include: {
                category: true,
              },
            },
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });
      });

      if (!product) {
        this.logger.warn(` ⚠️Failed to create product`, 'ProductService');
        throw new InternalServerErrorException('Failed to create product');
      }

      this.logger.info(
        `✅ Product created: ${product.id} - ${product.title}`,
        'ProductService',
      );

      return product;
    } catch (error) {
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `⛔ Error in create product: ${message}`,
        'ProductService',
      );
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

  public async findAll() {
    return `This action returns all product`;
  }

  public async findOne(id: number) {
    return `This action returns a #${id} product`;
  }

  public async update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  public async remove(id: number) {
    return `This action removes a #${id} product`;
  }
}
