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
  ApiTags,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';

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
