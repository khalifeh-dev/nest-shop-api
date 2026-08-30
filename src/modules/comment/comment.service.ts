import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import type { LoggerService } from '../../common/services/logger/logger-options.interface';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment } from '@prisma/client';
import { ErrorUtil } from '../../common/utils/error.util';
import { UserService } from '../user/user.service';

@Injectable()
export class CommentService {
  constructor(
    private prisma: DatabaseService,
    private userService: UserService,
    @Inject('LoggerService') private logger: LoggerService,
  ) {}

  public async create(dto: CreateCommentDto): Promise<Comment> {
    try {
      this.logger.info(
        `🧩 Create a comment for product: ${dto.productId} from user: ${dto.userId}`,
        'CommentService',
      );

      const { parentId, userId, ...commentDto } = dto;

      const user = await this.userService.secureFindOne(userId);

      let parentComment: any = null;

      if (parentId) {
        parentComment = await this.prisma.replica.comment.findUnique({
          where: { id: parentId },
        });

        if (!parentComment) {
          this.logger.warn(`⛔ Parent comment id not found`, 'CommentService');

          throw new NotFoundException(
            `Parent Comment Not Found With ID ${parentId} ❌.`,
          );
        }
      }

      const comment: Comment = await this.prisma.replica.comment.create({
        data: {
          content: commentDto.content,
          rating: commentDto.rating,
          userId: user.id,
          productId: commentDto.productId,
          parentId: parentId || null,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          },
          parent: true,
          replies: {
            include: {
              user: true,
            },
          },
        },
      });

      this.logger.info(
        `🧩 Create a comment for product: ${dto.productId} from user: ${dto.userId} successful`,
        'CommentService',
      );

      return comment;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in create comment: ${message}`,
        'CommentService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async findOne(id: string): Promise<Comment> {
    try {
      this.logger.info(`🔍 Find a comment with ID : ${id}`, 'CommentService');

      const comment = await this.prisma.replica.comment.findUnique({
        where: { id },
      });
      if (!comment) {
        this.logger.warn(
          `⛔ Comment not found with ID: ${id}`,
          'CommentService',
        );
        throw new NotFoundException(`Comment not found with ID: ${id}`);
      }

      if (comment.isDeleted) {
        this.logger.warn(
          `⛔ Comment with ID ${id} has already deleted`,
          'CommentService',
        );
        throw new NotFoundException(
          `Comment with ID ${id} has already deleted`,
        );
      }

      return comment;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in find one comment: ${message}`,
        'CommentService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }
}
