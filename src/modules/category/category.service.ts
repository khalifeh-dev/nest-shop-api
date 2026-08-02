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
import { Category } from '@prisma/client';
import { ErrorUtil } from '../../common/utils/error.util';

@Injectable()
export class CategoryService {
  constructor(
    private prisma: DatabaseService,
    @Inject('LoggerService') private logger: LoggerService,
  ) {}

  public async create(dto: CreateCategoryDto): Promise<Category> {
    try {
      this.logger.debug(
        `📝 Creating category: ${dto.name}`,
        'CategoryService',
      );

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

      let { slug } = dto;
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

  public async findAll() {
    return `This action returns all category`;
  }

  public async findOne(id: number) {
    return `This action returns a #${id} category`;
  }

  public async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    return `This action updates a #${id} category`;
  }

  public async remove(id: number) {
    return `This action removes a #${id} category`;
  }
}
