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
import { Prisma, Product } from '@prisma/client';
import { CloudinaryService } from '../../common/services/cloudinary/cloudinary.service';
import { ProductFilterDto } from './dto/product-filter.dto';
import { Pagination } from '../../common/utils/pagination';
import { FindAll } from '../../common/types/find-all.type';

@Injectable()
export class ProductService {
  constructor(
    private prisma: DatabaseService,
    @Inject('LoggerService') private logger: LoggerService,
    private cloudinaryService: CloudinaryService,
  ) {}

  public async uploadProductImages(
    files: Express.Multer.File[],
    productId: string,
  ) {
    try {
      this.logger.debug(
        `📷 Uploading ${files.length} images for product: ${productId}`,
        'ProductService',
      );

      const product = await this.prisma.replica.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product not found with ID ${productId}`);
      }

      const uploadResults = await this.cloudinaryService.uploadProductImages(
        files,
        productId,
        { minImages: 1, maxImages: 10 },
      );

      const images = await this.prisma.transaction(async (prisma) => {
        const savedImages = await Promise.all(
          uploadResults.map((result, index) => {
            return prisma.productImage.create({
              data: {
                productId,
                url: result.secure_url,
                publicId: result.public_id,
                size: result.bytes,
                mimeType: result.format,
                width: result.width,
                height: result.height,
                isActive: true,
              },
            });
          }),
        );

        return savedImages;
      });

      this.logger.info(
        `✅ ${images.length} images uploaded for product: ${productId}`,
        'ProductService',
      );

      return images;
    } catch (error) {
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `⛔ Error in create product: ${message}`,
        'ProductService',
      );
      throw new InternalServerErrorException('Internal Server Error');
    }
  }

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

  public async findAll(dto: ProductFilterDto): Promise<FindAll<Product>> {
    try {
      this.logger.info(
        `🔍 Finding all product with page: ${dto.page} & limit: ${dto.limit}`,
        'ProductService',
      );

      const {
        page,
        limit,
        search,
        sortOrder,
        sortBy,
        minPrice,
        maxPrice,
        isActive,
        inStock,
        brand,
      } = dto;

      const { finalLimit, skip } = Pagination.values(limit, page);

      const where = this.buildFindAllWhereClause({
        search,
        minPrice,
        maxPrice,
        isActive,
        inStock,
        brand,
      });

      const orderBy = this.buildFindAllOrderBy(sortBy, sortOrder);

      const [data, total] = await Promise.all([
        this.prisma.replica.product.findMany({
          where,
          skip,
          take: finalLimit,
          orderBy,
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
        }),
        this.prisma.replica.product.count({ where }),
      ]);

      this.logger.info(`✅ Founded ${data.length} products`, 'ProductService');

      const totalPages = Math.ceil(total / finalLimit);

      return {
        data,
        total,
        limit: finalLimit,
        page,
        pages: totalPages,
      };
    } catch (error) {
      const message = ErrorUtil.getMessage(error);
      this.logger.error(`⛔ Error in find all: ${message}`, 'ProductService');
      throw new InternalServerErrorException('Internal Server Error.');
    }
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

  private buildFindAllWhereClause({
    search,
    minPrice,
    maxPrice,
    isActive,
    inStock,
    brand,
  }: {
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    isActive?: boolean;
    inStock?: boolean;
    brand?: string;
  }): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};

    if (isActive !== undefined) where.isActive = isActive;
    if (brand) where.brand = { contains: brand, mode: 'insensitive' };
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }
    if (inStock !== undefined)
      where.stock = inStock ? { gt: 0 } : { equals: 0 };

    if (search?.trim()) {
      const term = search.trim();
      where.OR = ['title', 'description', 'brand', 'model'].map((field) => ({
        [field]: { contains: term, mode: 'insensitive' },
      }));
    }

    return where;
  }

  private buildFindAllOrderBy(
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Prisma.ProductOrderByWithRelationInput {
    const allowedFields = [
      'createdAt',
      'price',
      'rating',
      'title',
      'updatedAt',
    ];
    const field = allowedFields.includes(sortBy) ? sortBy : 'createdAt';

    return {
      [field]: sortOrder,
    };
  }
}
