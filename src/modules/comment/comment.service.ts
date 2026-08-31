import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import type { LoggerService } from '../../common/services/logger/logger-options.interface';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment, CommentStatus } from '@prisma/client';
import { ErrorUtil } from '../../common/utils/error.util';
import { UserService } from '../user/user.service';
import { FindAll } from '../../common/types/find-all.type';
import { GetCommentDto } from './dto/get-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentService {
  private readonly EDIT_WINDOW_MINUTES = 5;

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

      if (parentId) parentComment = await this.findOne(parentId);

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
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
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
        throw new BadRequestException(
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

  public async update(id: string, dto: UpdateCommentDto): Promise<Comment> {
    try {
      this.logger.info(`🧩 Update comment with ID: ${id}`, 'CommentService');

      const existingComment = await this.findOne(id);

      const now = new Date();
      const createdAt = new Date(existingComment.createdAt);
      const minutesDiff = (now.getTime() - createdAt.getTime()) / 60000;

      if (minutesDiff > this.EDIT_WINDOW_MINUTES) {
        throw new BadRequestException(
          `You can only edit comments within ${this.EDIT_WINDOW_MINUTES} minutes of creation.`,
        );
      }
      const comment: Comment = await this.prisma.master.comment.update({
        where: { id },
        data: { ...dto, editedAt: new Date() },
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

      this.logger.info(
        `🧩 Updated comment with ID: ${id} successfuly`,
        'CommentService',
      );

      return comment;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in update comment: ${message}`,
        'CommentService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async softDelete(id: string) {
    try {
      this.logger.info(
        `🪓 Soft delete comment with ID: ${id}`,
        'CommentService',
      );
      await this.findOne(id);

      const replyCount = await this.prisma.replica.comment.count({
        where: { parentId: id, isDeleted: false },
      });

      if (replyCount > 0) {
        await this.prisma.master.comment.updateMany({
          where: { parentId: id },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
            status: CommentStatus.DELETED,
          },
        });
      }

      const deletedComment = await this.prisma.transaction(async (tx) => {
        const comment = await tx.comment.update({
          where: { id },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
            status: CommentStatus.DELETED,
          },
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

        return { comment, replyCounts: replyCount };
      });

      this.logger.info(
        `🪓 Soft delete comment with ID: ${id} successfuly`,
        'CommentService',
      );

      return deletedComment;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in soft delete comment: ${message}`,
        'CommentService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async hardDelete(id: string) {
    try {
      this.logger.info(
        `🪓 Hard delete comment with ID: ${id}`,
        'CommentService',
      );

      const existingComment = await this.findOne(id);

      if (!existingComment.isDeleted) {
        this.logger.warn(
          `⛔ You cannot hard delete this because you must soft delete it first.`,
          'CommentService',
        );

        throw new BadRequestException(
          'Please soft delete the comment first before permanent deletion.',
        );
      }

      const comment = await this.prisma.master.$transaction(async (tx) => {
        await tx.comment.deleteMany({
          where: { parentId: id },
        });

        await tx.comment.delete({
          where: { id },
        });
      });

      this.logger.info(
        `🪓 Hard delete comment with ID: ${id} successfuly`,
        'CommentService',
      );

      return comment;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in hard delete comment: ${message}`,
        'CommentService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async restore(id: string): Promise<Comment> {
    try {
      this.logger.info(`♻️ Restoring comment with ID: ${id}`, 'CommentService');

      await this.findOne(id);

      const restoredComment = await this.prisma.master.comment.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
          status: CommentStatus.PENDING,
        },
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

      this.logger.info(
        `✅ Comment restored successfully: ${restoredComment.id}`,
        'CommentService',
      );

      return restoredComment;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in restore comment: ${message}`,
        'CommentService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async setStatus(commentId: string, status: CommentStatus) {
    try {
      this.logger.info(
        `🧩 set ${status} to the comment with ID: ${commentId}`,
        'CommentService',
      );

      const existingComment = await this.findOne(commentId);

      if (existingComment.status === status) {
        this.logger.warn(
          `⛔ Comment has already been this status`,
          'CommentService',
        );
        throw new ConflictException(`Comment has already been this status`);
      }

      this.validateStatusTransition(existingComment.status, status);

      const updatedComment = await this.prisma.master.$transaction(
        async (tx) => {
          const comment = await tx.comment.update({
            where: { id: commentId },
            data: {
              status,
              ...(status === CommentStatus.APPROVED && {
                approvedAt: new Date(),
              }),
            },
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

          return comment;
        },
      );

      this.logger.info(
        `✅ Status updated to "${status}" for comment ${commentId}`,
        'CommentService',
      );

      return updatedComment;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      )
        throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in set status comment: ${message}`,
        'CommentService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  //! Need fix a bug
  public async getProductComments(
    productId: string,
    limit: number = 20,
    page: number = 1,
    offset: number = 3,
    status: Omit<CommentStatus, 'DELETED' | 'HIDDEN'>,
  ) {
    try {
      this.logger.info(
        `🔍 Get product: ${productId} comments`,
        'CommentService',
      );
      //! await this.productService.findOne(productId)

      const comments = await this.findAll({
        limit,
        page,
        offset,
        productId,
        ...(status === undefined && { status: CommentStatus.APPROVED }),
      });

      this.logger.info(
        `✅ Get product: ${productId} comments successfuly`,
        'CommentService',
      );

      return comments;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      )
        throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in get product comment comment: ${message}`,
        'CommentService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async getUserComments(
    userId: string,
    limit: number = 20,
    page: number = 1,
    offset: number = 3,
    status: Omit<CommentStatus, 'DELETED' | 'HIDDEN'>,
  ) {
    try {
      this.logger.info(`🔍 Get user: ${userId} comments`, 'CommentService');
      await this.userService.findOne(userId);

      const comments = await this.findAll({
        limit,
        page,
        offset,
        userId,
        ...(status === undefined && { status: CommentStatus.APPROVED }),
      });

      this.logger.info(
        `✅ Get user: ${userId} comments successfuly`,
        'CommentService',
      );

      return comments;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      )
        throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in get product comment comment: ${message}`,
        'CommentService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  private validateStatusTransition(
    currentStatus: CommentStatus,
    newStatus: CommentStatus,
  ): void {
    const validTransitions: Record<CommentStatus, CommentStatus[]> = {
      [CommentStatus.PENDING]: [
        CommentStatus.APPROVED,
        CommentStatus.REJECTED,
        CommentStatus.HIDDEN,
        CommentStatus.FLAGGED,
      ],
      [CommentStatus.APPROVED]: [
        CommentStatus.HIDDEN,
        CommentStatus.DELETED,
        CommentStatus.FLAGGED,
      ],
      [CommentStatus.REJECTED]: [CommentStatus.PENDING, CommentStatus.DELETED],
      [CommentStatus.HIDDEN]: [CommentStatus.APPROVED, CommentStatus.DELETED],
      [CommentStatus.FLAGGED]: [
        CommentStatus.PENDING,
        CommentStatus.APPROVED,
        CommentStatus.REJECTED,
        CommentStatus.HIDDEN,
        CommentStatus.DELETED,
      ],
      [CommentStatus.DELETED]: [],
    };

    const allowed = validTransitions[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot change status from "${currentStatus}" to "${newStatus}". ` +
          `Allowed transitions: ${allowed.join(', ') || 'none'}`,
      );
    }
  }
}
