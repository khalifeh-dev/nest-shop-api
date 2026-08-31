import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { GetCommentDto } from './dto/get-comment.dto';
import { Pagination } from '../../common/types/pagination.type';
import { UpdateCommentDto } from './dto/update-comment.dto';

@ApiTags('Comments')
@ApiBearerAuth()
@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a comment' })
  @HttpCode(HttpStatus.CREATED)
  public async create(@Body() dto: CreateCommentDto): Promise<Comment> {
    const comment: Comment = await this.commentService.create(dto);

    return comment;
  }

  @Get()
  @ApiOperation({ summary: 'Find a comment' })
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 3 })
  @ApiQuery({ name: 'productId', required: false, type: String, example: '' })
  @ApiQuery({ name: 'userId', required: false, type: String, example: '' })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    example: 'APPROVED',
  })
  @ApiQuery({
    name: 'hasReplies',
    required: false,
    type: 'boolean',
    example: false,
  })
  @ApiQuery({ name: 'minRating', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'maxRating', required: false, type: Number, example: 5 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    example: 'desc',
  })
  public async findAll(
    @Query() dto: GetCommentDto,
  ): Promise<Pagination<Comment>> {
    const comments = await this.commentService.findAll(dto);

    const { data: allData, limit: lim, page: pg, total, pages } = comments;

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
  @ApiOperation({ summary: 'Find a comment' })
  @HttpCode(HttpStatus.OK)
  public async findOne(@Param('id') id: string) {
    const comment: Comment = await this.commentService.findOne(id);

    return comment;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Find a comment' })
  @HttpCode(HttpStatus.OK)
  public async update(@Param("id") id: string, @Body() dto: UpdateCommentDto) {

    const comment = await this.commentService.update(id, dto)

    return comment
    
  }
}
