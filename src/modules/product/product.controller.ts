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
  UseInterceptors,
  UploadedFiles,
  Query,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FindAllUserDto } from '../user/dto/find-all.dto';
import { Pagination } from '../../common/types/pagination.type';

@ApiTags('Product')
@ApiBearerAuth()
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post('uplaodImages/:productId')
  @ApiOperation({ summary: 'Upload product images' })
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload product',
    description: 'Upload a new product image for the current product',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'string', format: 'binary' },
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  public async uploadProductImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Param('productId') productId: string,
  ) {
    const result = await this.productService.uploadProductImages(
      files,
      productId,
    );

    return result;
  }

  @Post('create/:userId')
  @ApiOperation({ summary: 'Create product' })
  @HttpCode(HttpStatus.CREATED)
  public async create(
    @Body() createProductDto: CreateProductDto,
    @Param('userId') userId: string,
  ): Promise<Product> {
    const result = this.productService.create(createProductDto, userId);
    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Get all product' })
  @HttpCode(HttpStatus.CREATED)
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'search', required: false, type: String, example: '' })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, example: '' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: '' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, example: '' })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, example: '' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, example: '' })
  @ApiQuery({ name: 'inStock', required: false, type: Boolean, example: '' })
  @ApiQuery({ name: 'brand', required: false, type: String, example: '' })
  public async findAll(
    @Query() dto: FindAllUserDto,
  ): Promise<Pagination<Product>> {
    const result = await this.productService.findAll(dto);

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
  @ApiOperation({ summary: 'Get a product' })
  @ApiParam({ name: 'id', description: 'product ID', type: String })
  @HttpCode(HttpStatus.OK)
  public async findOne(@Param('id') id: string) {
    return await this.productService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product' })
  @HttpCode(HttpStatus.OK)
  public async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    
    const result = await this.productService.update(id, updateProductDto);

    return result

  }

  @Delete(':id')
  public async remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}
