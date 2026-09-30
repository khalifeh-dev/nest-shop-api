// src/modules/shipping/shipping.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { CalculateShippingDto } from './dto/calculate-shipping.dto';
import { CreateShippingDto } from './dto/create-shipment.dto';

@ApiTags('Shipping')
@ApiBearerAuth()
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all shipping methods' })
  public async findAll() {
    return this.shippingService.findAllShippings();
  }

  @Post('calculate/:shippingId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate shipping cost' })
  public async calculate(@Param("shippingId") shippingId: string, @Body() dto: CalculateShippingDto) {
    return this.shippingService.calculateShippingCost(shippingId, dto);
  }

  @Get('track/:trackingCode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track a shipment' })
  public async track(@Param('trackingCode') trackingCode: string) {
    return this.shippingService.trackShipment(trackingCode);
  }

  @Post('create/:orderId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create shipment for an order (admin only)' })
  public async createShipment(@Param('orderId') orderId: string, @Body() dto: CreateShippingDto) {
    return this.shippingService.createShipment(orderId, dto);
  }
}
