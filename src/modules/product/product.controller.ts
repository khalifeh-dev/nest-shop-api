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
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Product')
@ApiBearerAuth()
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post(':userId')
  @ApiOperation({ summary: 'Create a product' })
  @HttpCode(HttpStatus.CREATED)
  public async create(
    @Body() createProductDto: CreateProductDto,
    @Param('userId') userId: string,
  ): Promise<Product> {
    const result = this.productService.create(createProductDto, userId);

    return result;
  }

  @Get()
  public async findAll() {
    return this.productService.findAll();
  }

  @Get(':id')
  public async findOne(@Param('id') id: string) {
    return this.productService.findOne(+id);
  }

  @Patch(':id')
  public async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productService.update(+id, updateProductDto);
  }

  @Delete(':id')
  public async remove(@Param('id') id: string) {
    return this.productService.remove(+id);
  }
}
