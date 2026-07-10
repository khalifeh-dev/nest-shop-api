import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  HttpCode,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Pagination } from '../../common/types/pagination.type';
import { SanitizeUser } from '../../common/types/user.type';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a user' })
  @HttpCode(HttpStatus.CREATED)
  public async create(@Body() dto: CreateUserDto): Promise<SanitizeUser> {
    return await this.userService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  public async findAll(
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ): Promise<Pagination<SanitizeUser>> {
    const data = await this.userService.findAll(
      limit ? +limit : 20,
      page ? +page : 1,
    );

    const { data: allData, limit: lim, page: pg, total, pages } = data;

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
  @ApiOperation({ summary: 'Get a user' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @HttpCode(HttpStatus.OK)
  public async findOne(@Param('id') id: string): Promise<SanitizeUser> {
    return await this.userService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @HttpCode(HttpStatus.OK)
  public async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<SanitizeUser> {
    return await this.userService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a user' })
  @ApiParam({ name: 'id', description: 'User ID', type: String })
  @HttpCode(HttpStatus.OK)
  public async remove(@Param('id') id: string): Promise<SanitizeUser> {
    return await this.userService.remove(id);
  }
}
