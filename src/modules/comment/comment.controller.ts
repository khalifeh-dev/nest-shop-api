import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

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

  @Get(":id")
  @ApiOperation({ summary: 'Find a comment' })
  @HttpCode(HttpStatus.OK)
  public async findOne (@Param("id") id: string) {

    const comment: Comment = await this.commentService.findOne(id)

    return comment

  }
}
