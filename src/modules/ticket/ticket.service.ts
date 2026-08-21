import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { UserService } from '../user/user.service';
import { CreateTicketDto, GetTicketsDto } from './dto';
import type { LoggerService } from '../../common/services/logger/logger-options.interface';
import { ErrorUtil } from '../../common/utils/error.util';
import {
  Prisma,
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@prisma/client';
import { FindAll } from '../../common/types/find-all.type';
import { Pagination } from '../../common/utils/pagination';

@Injectable()
export class TicketService {
  constructor(
    private prisma: DatabaseService,
    private userService: UserService,
    @Inject('LoggerService') private logger: LoggerService,
  ) {}

  public async create(dto: CreateTicketDto): Promise<Ticket> {
    try {
      this.logger.info(
        `🧩 Create a ticket with user: ${dto.userId}`,
        'TicketService',
      );
      const { userId, replyTo, ...ticketData } = dto;
      const user = await this.userService.secureFindOne(userId);

      if (replyTo) {
        const parentTicket = await this.prisma.replica.ticket.findUnique({
          where: { id: replyTo },
          select: {
            id: true,
            replyToId: true,
            isDeleted: true,
            status: true,
          },
        });

        console.log('Find Ticket: ', parentTicket?.isDeleted);
        this.validateParentTicket(parentTicket, replyTo);
      }

      const createData: any = {
        title: ticketData.title,
        description: ticketData.description,
        category: ticketData.category || TicketCategory.GENERAL,
        priority: ticketData.priority || TicketPriority.MEDIUM,
        status: replyTo ? TicketStatus.OPEN : TicketStatus.OPEN,
        tags: ticketData.tags || [],
        attachments: ticketData.attachments || null,
        user: {
          connect: { id: user.id },
        },
      };

      if (replyTo) createData.replyTo = { connect: { id: replyTo } };

      const ticket = await this.prisma.master.$transaction(async (tx) => {
        const newTicket = await tx.ticket.create({
          data: createData,
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
            replyTo: {
              select: {
                id: true,
                title: true,
                description: true,
                status: true,
              },
            },
          },
        });

        if (replyTo) {
          await tx.ticket.update({
            where: { id: replyTo },
            data: {
              replyCount: { increment: 1 },
              lastRepliedAt: new Date(),
            },
          });
        }

        return newTicket;
      });

      this.logger.info(
        `✅ Ticket created successfully: ${ticket.id} by user ${userId}`,
        'TicketService',
      );

      return ticket;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in create ticket: ${message}`,
        'TicketService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async findAll(dto: any): Promise<FindAll<Ticket>> {
    try {
      this.logger.info(
        `🔍 Finding all ticket with page: ${dto.page} & limit: ${dto.limit}`,
        'TicketService',
      );

      const where = this.buildWhereClause(dto);
      const select = this.buildSelectClause(dto);

      const { finalLimit, skip } = Pagination.values(dto.limit, dto.page);

      const [tickets, total] = await Promise.all([
        this.prisma.replica.ticket.findMany({
          where,
          skip,
          take: finalLimit,
          orderBy: { [dto.sortBy]: dto.sortOrder },
          select,
        }),
        this.prisma.replica.ticket.count({ where }),
      ]);

      this.logger.info(`✅ Founded ${tickets.length} user`, 'UserService');

      const totalPages = Math.ceil(total / finalLimit);

      return {
        data: tickets,
        total,
        limit: finalLimit,
        page: dto.page,
        pages: totalPages,
        ...(dto.groupBy && { grouped: await this.getGroupedData(dto, where) }),
        ...(dto.includeStats && { stats: await this.getStats(dto, where) }),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      let message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in find all ticket: ${message}`,
        'TicketService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  private buildWhereClause(dto: GetTicketsDto): Prisma.TicketWhereInput {
    const where: Prisma.TicketWhereInput = {};

    this.applySimpleFilters(where, dto);
    this.applyNumericFilters(where, dto);
    this.applyDateFilters(where, dto);
    this.applySearchAndTags(where, dto);

    return where;
  }

private applySimpleFilters(
  where: Prisma.TicketWhereInput,
  dto: GetTicketsDto,
): void {
  const simpleFilters = [
    'userId',
    'parentId',
    'status',
    'priority',
    'category',
  ] as const;

  for (const key of simpleFilters) {
    const value = dto[key];
    if (value !== undefined && value !== null) {
      where[key] = value;
    }
  }

  if (dto.isDeleted !== undefined && dto.isDeleted !== null) {
    where.isDeleted = dto.isDeleted === true;
  }

  if (dto.hasReplies !== undefined && dto.hasReplies !== null) {
    const hasReplies = dto.hasReplies === true;
    where.replyCount = hasReplies ? { gt: 0 } : 0;
  }
}

  private applyNumericFilters(
    where: Prisma.TicketWhereInput,
    dto: GetTicketsDto,
  ): void {
    const numericFilters = [
      { key: 'replyCount', min: Number(dto.minReplyCount), max: Number(dto.maxReplyCount) },
      { key: 'rating', min: Number(dto.minRating), max: Number(dto.maxRating) },
    ];

    for (const { key, min, max } of numericFilters) {
      if (min !== undefined || max !== undefined) {
        where[key] = {};
        if (min) where[key].gte = min;
        if (max) where[key].lte = max;
      }
    }
  }

  private applyDateFilters(
    where: Prisma.TicketWhereInput,
    dto: GetTicketsDto,
  ): void {
    const dateFilters = [
      { field: 'createdAt', from: dto.fromDate, to: dto.toDate },
      { field: 'resolvedAt', from: dto.resolvedFrom, to: dto.resolvedTo },
    ];

    for (const { field, from, to } of dateFilters) {
      if (from || to) {
        where[field] = {};
        if (from) where[field].gte = new Date(from);
        if (to) where[field].lte = new Date(to);
      }
    }
  }

  private applySearchAndTags(
    where: Prisma.TicketWhereInput,
    dto: GetTicketsDto,
  ): void {
    if (dto.search) {
      where.OR = [
        { title: { contains: dto.search, mode: 'insensitive' } },
        { description: { contains: dto.search, mode: 'insensitive' } },
        { tags: { has: dto.search } },
      ];
    }

    if (dto.tags?.length) {
      where.tags = dto.matchAllTags
        ? { hasEvery: dto.tags }
        : { hasSome: dto.tags };
    }
  }

  private buildSelectClause(dto: GetTicketsDto): any {
    const select: any = {
      id: true,
      title: true,
      description: true,
      category: true,
      priority: true,
      status: true,
      replyCount: true,
      rating: true,
      tags: true,
      attachments: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      closedAt: true,
      lastRepliedAt: true,
      isDeleted: true,
    };
    const relations = [
      {
        key: 'user',
        condition: dto.includeUser,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      {
        key: 'replies',
        condition: dto.includeReplies,
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
      },
      {
        key: 'replyTo',
        condition: dto.includeParent,
        select: {
          id: true,
          title: true,
          status: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    ];

    for (const { key, condition, select: relationSelect } of relations) {
      if (condition) {
        select[key] = { select: relationSelect };
      }
    }

    return select;
  }

  private async getGroupedData(
    dto: GetTicketsDto,
    where: Prisma.TicketWhereInput,
  ) {
    return this.prisma.replica.ticket.groupBy({
      by: [dto.groupBy as any],
      where,
      _count: { id: true },
      _avg: { replyCount: true, rating: true },
    });
  }

  private async getStats(dto: GetTicketsDto, where: Prisma.TicketWhereInput) {
    const [total, byStatus, byPriority, byCategory] = await Promise.all([
      this.prisma.replica.ticket.count({ where }),
      this.prisma.replica.ticket.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      this.prisma.replica.ticket.groupBy({
        by: ['priority'],
        where,
        _count: { id: true },
      }),
      this.prisma.replica.ticket.groupBy({
        by: ['category'],
        where,
        _count: { id: true },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      byPriority: byPriority.map((p) => ({
        priority: p.priority,
        count: p._count.id,
      })),
      byCategory: byCategory.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
    };
  }

  private validateParentTicket(parentTicket: any, replyTo: string): void {
    if (!parentTicket) {
      throw new NotFoundException(
        `Parent Ticket Not Found With ID ${replyTo} ❌.`,
      );
    }

    const errors: Record<string, () => void> = {
      isDeleted: () => {
        if (parentTicket.isDeleted)
          throw new BadRequestException('Cannot reply to a deleted ticket ❌.');
      },
      statusClosed: () => {
        if (parentTicket.status === TicketStatus.CLOSED)
          throw new BadRequestException('Cannot reply to a closed ticket ❌.');
      },
      isReply: () => {
        if (parentTicket.replyToId)
          throw new BadRequestException(
            'Cannot reply to a reply ticket. Please reply to the main ticket ❌.',
          );
      },
    };

    Object.values(errors).forEach((fn) => fn());
  }
}
