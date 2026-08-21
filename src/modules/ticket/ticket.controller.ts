import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Ticket, TicketStatus } from '@prisma/client';
import { Pagination } from '../../common/types/pagination.type';
import { FindAll } from '../../common/types/find-all.type';

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

  @Get()
  @ApiOperation({ summary: 'Get all tickets with pagination & Filters' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'status', required: false, type: 'string', example: '' })
  @ApiQuery({ name: 'priority', required: false, type: 'string', example: '' })
  @ApiQuery({ name: 'category', required: false, type: 'string', example: '' })
  @ApiQuery({ name: 'userId', required: false, type: 'string', example: '' })
  @ApiQuery({ name: 'parentId', required: false, type: 'string', example: '' })
  @ApiQuery({
    name: 'hasReplies',
    required: false,
    type: 'boolean',
    example: false,
  })
  @ApiQuery({
    name: 'isDeleted',
    required: false,
    type: 'boolean',
    example: false,
  })
  @ApiQuery({
    name: 'minReplyCount',
    required: false,
    type: 'number',
    example: 0,
  })
  @ApiQuery({
    name: 'maxReplyCount',
    required: false,
    type: 'number',
    example: 0,
  })
  @ApiQuery({ name: 'minRating', required: false, type: 'number', example: 1 })
  @ApiQuery({ name: 'maxRating', required: false, type: 'number', example: 5 })
  @ApiQuery({ name: 'fromDate', required: false, type: 'string', example: '' })
  @ApiQuery({
    name: 'resolvedFrom',
    required: false,
    type: 'string',
    example: '',
  })
  @ApiQuery({
    name: 'resolvedTo',
    required: false,
    type: 'string',
    example: '',
  })
  @ApiQuery({ name: 'search', required: false, type: 'string', example: '' })
  @ApiQuery({ name: 'sortedBy', required: false, type: 'string', example: '' })
  @ApiQuery({
    name: 'sortedOrder',
    required: false,
    type: 'string',
    example: '',
  })
  @ApiQuery({
    name: 'includeUser',
    required: false,
    type: 'boolean',
    example: false,
  })
  @ApiQuery({
    name: 'includeParent',
    required: false,
    type: 'boolean',
    example: false,
  })
  @ApiQuery({
    name: 'includeRepliesCount',
    required: false,
    type: 'boolean',
    example: false,
  })
  @ApiQuery({
    name: 'includeStats',
    required: false,
    type: 'boolean',
    example: false,
  })
  @ApiQuery({ name: 'grupBy', required: false, type: 'string', example: '' })
  @ApiQuery({ name: 'tags', required: false, type: 'string', example: '' })
  @ApiQuery({
    name: 'matchAllTags',
    required: false,
    type: 'boolean',
    example: false,
  })
  @HttpCode(HttpStatus.OK)
  public async findAll(@Query() dto: any): Promise<Pagination<Ticket>> {
    const result: FindAll<Ticket> = await this.ticketService.findAll(dto);
    const { data: allData, limit: lim, page: pg, total, pages } = result;

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
  @ApiOperation({ summary: 'Find a ticket' })
  @HttpCode(HttpStatus.OK)
  public async findOne(@Param('id') id: string) {
    const ticket: Ticket = await this.ticketService.findOne(id);

    return ticket;
  }
}
