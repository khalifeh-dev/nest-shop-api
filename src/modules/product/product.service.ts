import {
  BadRequestException,
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
import { UserService } from '../user/user.service';
import { find, pick } from 'lodash';

@Injectable()
export class ProductService {
  constructor(
    private prisma: DatabaseService,
    @Inject('LoggerService') private logger: LoggerService,
    private cloudinaryService: CloudinaryService,
    private userService: UserService,
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
      await this.userService.secureFindOne(userId);

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

  public async findOne(
    id: string,
    options?: Omit<Prisma.ProductFindUniqueArgs, 'where'>,
  ): Promise<Product> {
    try {
      const findProduct = await this.prisma.replica.product.findUnique({
        where: { id },
        ...options,
      });

      if (!findProduct)
        throw new NotFoundException(`Product not found with ID ${id}.`);

      if (findProduct.isDeleted)
        throw new BadRequestException(`This product has already been removed.`);

      if (!findProduct.isActive)
        throw new BadRequestException('Product is not active');

      return findProduct;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(`⛔ Error in find one: ${message}`, 'ProductService');
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  public async update(id: string, dto: UpdateProductDto): Promise<Product> {
    try {
      this.logger.info(`🔄️ Update product: ${id}`, 'ProductService');

      await this.findOne(id);

      const { categoryIds, ...productData } = dto;
      const updateData: any = { ...productData };

      if (categoryIds) {
        if (categoryIds.length === 0) {
          throw new BadRequestException('At least one category is required');
        }

        const existingCategories = await this.prisma.replica.category.findMany({
          where: { id: { in: categoryIds }, isActive: true },
          select: { id: true },
        });

        if (existingCategories.length !== categoryIds.length) {
          const foundIds = existingCategories.map((c) => c.id);
          const missingIds = categoryIds.filter((id) => !foundIds.includes(id));
          throw new BadRequestException(
            `Categories not found: ${missingIds.join(', ')}`,
          );
        }

        updateData.categories = {
          set: categoryIds.map((id) => ({ id })),
        };
      }

      const updateProduct = await this.prisma.master.product.update({
        where: { id },
        data: updateData,
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

      this.logger.info(`✅ Product updated: ${id}`, 'ProductService');

      return updateProduct;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(`⛔ Error in update: ${message}`, 'ProductService');
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  public async remove(id: string): Promise<Product> {
    try {
      this.logger.info(`🗑️ Soft deleting product: ${id}`, 'ProductService');

      await this.findOne(id);

      const deletedProduct = await this.prisma.master.product.update({
        where: { id },
        data: { isActive: false, isDeleted: true, deletedAt: new Date() },
      });

      this.logger.info(`✅ Product soft deleted: ${id}`, 'ProductService');

      return deletedProduct;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(`⛔ Error in remove: ${message}`, 'ProductService');
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  public async hardDelete(id: string): Promise<Product> {
    try {
      this.logger.info(`🗑️ Hard deleting product: ${id}`, 'ProductService');

      await this.findOne(id);

      const product = await this.prisma.replica.product.findUnique({
        where: { id },
        include: { images: true },
      });

      if (product?.images && product.images.length > 0) {
        for (const image of product.images) {
          await this.cloudinaryService.deleteFile(image.publicId);
        }
        this.logger.info(
          `🗑️ Deleted ${product.images.length} images from Cloudinary`,
          'ProductService',
        );
      }

      const deletedProduct = await this.prisma.master.product.delete({
        where: { id },
      });

      this.logger.info(`✅ Product hard deleted: ${id}`, 'ProductService');

      return deletedProduct;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `⛔ Error in hard delete: ${message}`,
        'ProductService',
      );
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  public async restore(id: string): Promise<Product> {
    try {
      this.logger.info(`♻️ Restoring product: ${id}`, 'ProductService');

      const product = await this.findOne(id);

      if (product.isActive) {
        throw new BadRequestException('Product is already active');
      }

      const restoredProduct = await this.prisma.master.product.update({
        where: { id },
        data: {
          isActive: true,
          isDeleted: false,
          deletedAt: null,
        },
      });

      this.logger.info(`✅ Product restored: ${id}`, 'ProductService');

      return restoredProduct;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(`⛔ Error in restore: ${message}`, 'ProductService');
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  async cleanupDeletedProducts() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const products = await this.prisma.replica.product.findMany({
      where: {
        isActive: false,
        isDeleted: true,
        deletedAt: { lt: thirtyDaysAgo },
      },
      include: { images: true },
    });

    for (const product of products) {
      for (const image of product.images) {
        await this.cloudinaryService.deleteFile(image.publicId);
      }
      await this.prisma.master.product.delete({
        where: { id: product.id },
      });
    }
  }

  public async decreaseStock(
    productId: string,
    quantity: number = 1,
  ): Promise<Product> {
    try {
      this.logger.info(
        `📦 Decreasing stock for product ${productId} by ${quantity}`,
        'ProductService',
      );

      const product = await this.findOne(productId, {
        select: { id: true, title: true, stock: true, isActive: true },
      });

      if (product.stock < quantity) {
        this.logger.warn(
          `⚠️ Insufficient stock for product ${productId}: requested ${quantity}, available ${product.stock}`,
          'ProductService',
        );
        throw new BadRequestException(
          `Insufficient stock. Available: ${product.stock}, Requested: ${quantity}`,
        );
      }

      const updatedProduct = await this.prisma.transaction(async (prisma) => {
        const updated = await prisma.product.update({
          where: { id: productId },
          data: {
            stock: {
              decrement: quantity,
            },
          },
        });

        return updated;
      });

      this.logger.info(
        `✅ Stock decreased for product ${productId}: ${product.stock} → ${updatedProduct.stock}`,
        'ProductService',
      );

      return updatedProduct;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `⛔ Error in decreaseStock: ${message}`,
        'ProductService',
      );
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  public async increaseStock(
    productId: string,
    quantity: number = 1,
  ): Promise<Product> {
    try {
      this.logger.info(
        `📦 Increasing stock for product ${productId} by ${quantity}`,
        'ProductService',
      );

      const product = await this.findOne(productId, {
        select: { id: true, title: true, stock: true, isActive: true },
      });

      const updatedProduct = await this.prisma.transaction(async (prisma) => {
        const updated = await prisma.product.update({
          where: { id: productId },
          data: {
            stock: {
              increment: quantity,
            },
          },
        });

        return updated;
      });

      this.logger.info(
        `✅ Stock increased for product ${productId}: ${product.stock} → ${updatedProduct.stock}`,
        'ProductService',
      );

      return updatedProduct;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `⛔ Error in increaseStock: ${message}`,
        'ProductService',
      );
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  public async checkStock(
    productId: string,
    quantity?: number,
  ): Promise<{
    id: string;
    title: string;
    stock: number;
    isAvailable: boolean;
    requestedQuantity?: number;
  }> {
    try {
      this.logger.debug(
        `🔍 Checking stock for product ${productId}`,
        'ProductService',
      );

      const product = await this.findOne(productId, {
        select: {
          id: true,
          title: true,
          stock: true,
          isActive: true,
        },
      });

      const isAvailable = product.isActive && product.stock > 0;

      if (quantity !== undefined && quantity > 0) {
        const hasEnoughStock = product.stock >= quantity;
        return {
          ...product,
          isAvailable: isAvailable && hasEnoughStock,
          requestedQuantity: quantity,
        };
      }

      return {
        ...product,
        isAvailable,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(`⛔ Error in checkStock: ${message}`, 'ProductService');
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  public async setStock(productId: string, newStock: number): Promise<Product> {
    try {
      this.logger.info(
        `📦 Setting stock for product ${productId} to ${newStock}`,
        'ProductService',
      );

      if (newStock < 0)
        throw new BadRequestException('Stock cannot be negative');

      const product = await this.findOne(productId, {
        select: { id: true, title: true, stock: true },
      });

      const updatedProduct = await this.prisma.master.product.update({
        where: { id: productId },
        data: {
          stock: newStock,
        },
      });

      this.logger.info(
        `✅ Stock set for product ${productId}: ${product.stock} → ${newStock}`,
        'ProductService',
      );

      return updatedProduct;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(`⛔ Error in setStock: ${message}`, 'ProductService');
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  public async checkMultipleStock(
    items: { productId: string; quantity: number }[],
  ): Promise<{
    allAvailable: boolean;
    items: {
      productId: string;
      title: string;
      stock: number;
      requested: number;
      available: boolean;
    }[];
  }> {
    try {
      this.logger.debug(
        `🔍 Checking stock for ${items.length} products`,
        'ProductService',
      );

      const productIds = items.map((item) => item.productId);

      const products = await this.prisma.replica.product.findMany({
        where: {
          id: { in: productIds },
          isActive: true,
        },
        select: {
          id: true,
          title: true,
          stock: true,
        },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      const result = items.map((item) => {
        const product = productMap.get(item.productId);
        const available = !!product && product.stock >= item.quantity;

        return {
          productId: item.productId,
          title: product?.title || 'Unknown',
          stock: product?.stock || 0,
          requested: item.quantity,
          available,
        };
      });

      const allAvailable = result.every((item) => item.available);

      return {
        allAvailable,
        items: result,
      };
    } catch (error) {
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `⛔ Error in checkMultipleStock: ${message}`,
        'ProductService',
      );
      throw new InternalServerErrorException('Internal Server Error.');
    }
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
