import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { UserService } from '../user/user.service';
import { CreateTicketDto } from './dto';
import type { LoggerService } from '../../common/services/logger/logger-options.interface';
import { ErrorUtil } from '../../common/utils/error.util';
import {
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@prisma/client';

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

  private validateParentTicket(parentTicket: any, replyTo: string): void {
    if (!parentTicket) {
      throw new NotFoundException(
        `Parent Ticket Not Found With ID ${replyTo} ❌.`,
      );
    }

    const errors: Record<string, () => void> = {
      isDeleted: () => {
        throw new BadRequestException('Cannot reply to a deleted ticket ❌.');
      },
      statusClosed: () => {
        if (parentTicket.status === TicketStatus.CLOSED) {
          throw new BadRequestException('Cannot reply to a closed ticket ❌.');
        }
      },
      isReply: () => {
        if (parentTicket.replyToId) {
          throw new BadRequestException(
            'Cannot reply to a reply ticket. Please reply to the main ticket ❌.',
          );
        }
      },
    };

    Object.values(errors).forEach((fn) => fn());
  }
}
