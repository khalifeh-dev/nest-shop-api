import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Ticket } from '@prisma/client';

@ApiTags('Tickets')
@ApiBearerAuth()
@Controller('ticket')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post()
  @ApiOperation({ summary: 'Create a ticket' })
  @HttpCode(HttpStatus.CREATED)
  public async create(@Body() dto: CreateTicketDto): Promise<Ticket> {
    const result = await this.ticketService.create(dto);

    return result;
  }
}
