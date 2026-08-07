import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Category } from '@prisma/client';
import { Pagination } from '../../common/types/pagination.type';
import type {
  CategoryFilter,
  CategoryResponse,
} from '../../common/types/categoryResponse.type';

@ApiTags('Category')
@ApiBearerAuth()
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post(':userId')
  @ApiOperation({ summary: 'Create a Category' })
  @HttpCode(HttpStatus.CREATED)
  public async create(@Body() dto: CreateCategoryDto): Promise<Category> {
    const result = await this.categoryService.create(dto);

    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Get all category' })
  @HttpCode(HttpStatus.CREATED)
  public async findAll(
    @Query('limit') limit: number = 20,
    @Query('page') page: number = 1,
    @Query('filter') filter: CategoryFilter = { isActive: false },
  ): Promise<Pagination<CategoryResponse>> {
    const result = await this.categoryService.findAll(limit, page, filter);

    const { data: allData, limit: lim, page: pg, total, pages } = result;

    return {
      data: allData,
      pagination: {
        page: pg,
        limit: lim,
        total,
        pages,
        hasNext: pg < pages,
        hasPrev: pg > 1,
        nextPage: pg < pages ? pg + 1 : null,
        prevPage: pg > 1 ? pg - 1 : null,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category' })
  @ApiParam({ name: 'id', description: 'Category ID', type: String })
  @HttpCode(HttpStatus.OK)
  public async findOne(@Param('id') id: string) {
    return await this.categoryService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update category' })
  @HttpCode(HttpStatus.OK)
  public async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const result = await this.categoryService.update(id, updateCategoryDto);

    return result;
  }

  @Delete(':id/hard-delete')
  @ApiOperation({ summary: 'Hard delete category' })
  @HttpCode(HttpStatus.OK)
  public async remove(@Param('id') id: string): Promise<Category> {
    const result = await this.categoryService.remove(id);

    return result;
  }

  @Delete(':id/soft-delete')
  @ApiOperation({ summary: 'Soft delete category' })
  @HttpCode(HttpStatus.OK)
  public async softDelete(@Param('id') id: string): Promise<Category> {
    const result = await this.categoryService.softDelete(id);

    return result;
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore category' })
  @HttpCode(HttpStatus.OK)
  public async restore(@Param('id') id: string): Promise<Category> {
    const result = await this.categoryService.restore(id);

    return result;
  }
}
