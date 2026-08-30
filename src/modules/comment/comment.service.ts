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
import { FindAll } from '../../common/types/find-all.type';
import { GetCommentDto } from './dto/get-comment.dto';

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

  public async findAll(dto: GetCommentDto) {
    try {
      this.logger.info(`🔍 Find all comment`, 'CommentService');

      const {
        limit = 20,
        page = 1,
        productId,
        userId,
        status,
        hasReplies,
        minRating,
        maxRating,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        offset = 3,
      } = dto;

      const finalLimit = Math.min(Math.max(limit, 1), 50);
      const skip = (page - 1) * finalLimit;
      const replyOffset = Math.min(Math.max(offset || 3, 1), 10);

      const where: any = {
        parentId: null,
        isDeleted: false,
      };

      if (productId) where.productId = productId;
      if (userId) where.userId = userId;
      if (status) where.status = status;

      if (minRating !== undefined || maxRating !== undefined) {
        where.rating = {};
        if (minRating !== undefined) where.rating.gte = minRating;
        if (maxRating !== undefined) where.rating.lte = maxRating;
      }

      if (hasReplies !== undefined) {
        where.replyCount = hasReplies ? { gt: 0 } : 0;
      }

      const [comments, total] = await Promise.all([
        this.prisma.replica.comment.findMany({
          where,
          skip,
          take: finalLimit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            // product: {
            //   select: {
            //     id: true,
            //     title: true,
            //     slug: true,
            //   },
            // },
          },
        }),
        this.prisma.replica.comment.count({ where }),
      ]);

      const commentIds = comments.map((c) => c.id);
      const groupedReplies: Record<string, any[]> = {};
      const countMap: Record<string, number> = {};

      if (commentIds.length > 0) {
        const replies = await this.prisma.replica.comment.findMany({
          where: {
            parentId: { in: commentIds },
            isDeleted: false,
            status: 'APPROVED',
          },
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        });

        replies.forEach((reply) => {
          const parentId = reply.parentId!;
          if (!groupedReplies[parentId]) {
            groupedReplies[parentId] = [];
          }
          if (groupedReplies[parentId].length < replyOffset) {
            groupedReplies[parentId].push({
              id: reply.id,
              content: reply.content,
              rating: reply.rating,
              createdAt: reply.createdAt,
              user: reply.user,
            });
          }
        });

        const replyCounts = await this.prisma.replica.comment.groupBy({
          by: ['parentId'],
          where: {
            parentId: { in: commentIds },
            isDeleted: false,
            status: 'APPROVED',
          },
          _count: {
            id: true,
          },
        });

        replyCounts.forEach((item) => {
          countMap[item.parentId!] = item._count.id;
        });
      }

      const formattedComments = comments.map((comment) => {
        const replies = groupedReplies[comment.id] || [];
        const totalReplies = countMap[comment.id] || 0;

        return {
          ...comment,
          replies,
          totalReplies,
          hasMoreReplies: totalReplies > replies.length,
        };
      });

      const totalPages = Math.ceil(total / finalLimit);

      return {
        data: formattedComments,
        total,
        limit: finalLimit,
        page,
        pages: totalPages,
        meta: {
          replyOffset,
          totalComments: total,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in find all comment: ${message}`,
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

      this.logger.info(`🔍 Comment with ID : ${id} Found`, 'CommentService');

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
