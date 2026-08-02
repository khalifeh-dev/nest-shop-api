import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Category } from '@prisma/client';

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

    return result
  }

  @Get()
  public async findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id')
  public async findOne(@Param('id') id: string) {
    return this.categoryService.findOne(+id);
  }

  @Patch(':id')
  public async update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoryService.update(+id, updateCategoryDto);
  }

  @Delete(':id')
  public async remove(@Param('id') id: string) {
    return this.categoryService.remove(+id);
  }
}
