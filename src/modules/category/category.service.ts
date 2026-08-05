import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { DatabaseService } from '../../common/database/database.service';
import type { LoggerService } from '../../common/services/logger/logger-options.interface';
import { Category, Prisma } from '@prisma/client';
import { ErrorUtil } from '../../common/utils/error.util';
import { Pagination } from '../../common/utils/pagination';
import { FindAll } from '../../common/types/find-all.type';
import { CategoryResponse } from '../../common/types/categoryResponse.type';

@Injectable()
export class CategoryService {
  constructor(
    private prisma: DatabaseService,
    @Inject('LoggerService') private logger: LoggerService,
  ) {}

  public async create(dto: CreateCategoryDto): Promise<Category> {
    try {
      this.logger.debug(`📝 Creating category: ${dto.name}`, 'CategoryService');

      const existingName = await this.prisma.replica.category.findUnique({
        where: { name: dto.name },
      });

      if (existingName) {
        this.logger.warn(
          `⚠️ Category name already exists: ${dto.name}`,
          'CategoryService',
        );
        throw new ConflictException('Category with this name already exists');
      }

      let slug = dto.slug;
      if (!slug) {
        slug = dto.name
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
      }

      const existingSlug = await this.prisma.replica.category.findUnique({
        where: { slug },
      });

      if (existingSlug) {
        const random = Math.floor(Math.random() * 10000);
        slug = `${slug}-${random}`;
        this.logger.debug(
          `🔀 Slug already exists, using: ${slug}`,
          'CategoryService',
        );
      }

      const category: Category = await this.prisma.master.category.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          isActive: true,
        },
      });

      this.logger.info(
        `✅ Category created: ${category.id} - ${category.name}`,
        'CategoryService',
      );

      return category;
    } catch (error) {
      console.log;
      if (error instanceof ConflictException) throw error;
      if (error instanceof NotFoundException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `⛌ Error creating category: ${message}`,
        'CategoryService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async findAll(
    limit: number = 20,
    page: number = 1,
    filter?: { isActive?: boolean },
  ): Promise<FindAll<CategoryResponse>> {
    try {
      this.logger.info(
        `🔍 Finding all categories with page: ${page} & limit: ${limit}`,
        'CategoryService',
      );

      const { finalLimit, skip } = Pagination.values(limit, page);

      const where: Prisma.CategoryWhereInput = {};
      if (filter?.isActive) {
        where.isActive = filter?.isActive;
      }

      const [data, total] = await Promise.all([
        this.prisma.replica.category.findMany({
          where,
          skip,
          take: finalLimit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
          },
        }),
        this.prisma.replica.category.count({ where }),
      ]);

      this.logger.info(
        `✅ Founded ${data.length} categories`,
        'CategoryService',
      );

      const totalPages = Math.ceil(total / finalLimit);

      return {
        data,
        limit: finalLimit,
        page,
        pages: totalPages,
        total,
      };
    } catch (error) {
      const message = ErrorUtil.getMessage(error);
      this.logger.error(`⛔ Error in find all: ${message}`, 'CategoryService');
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  public async findOne(id: string): Promise<Category> {
    try {
      const findCategory = await this.prisma.replica.category.findUnique({
        where: { id },
      });

      if (!findCategory)
        throw new NotFoundException(`Category not found with ID ${id}.`);

      return findCategory;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(`⛔ Error in find one: ${message}`, 'CategoryService');
      throw new InternalServerErrorException('Internal Server Error.');
    }
  }

  public async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    return `This action updates a #${id} category`;
  }

  public async remove(id: string) {
    return `This action removes a #${id} category`;
  }
}
