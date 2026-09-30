// src/modules/shipping/shipping.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { ShippingFactory } from './factory/shipping.factory';
import { ShipmentStatus } from '@prisma/client';
import type { LoggerService } from '../../common/services/logger/logger-options.interface';
import { DatabaseService } from '../../common/database/database.service';
import { ErrorUtil } from '../../common/utils/error.util';
import { CalculateShippingDto } from './dto/calculate-shipping.dto';
import { CreateShippingDto } from './dto/create-shipment.dto';

@Injectable()
export class ShippingService {
  constructor(
    private prisma: DatabaseService,
    private shippingFactory: ShippingFactory,
    @Inject('LoggerService') private logger: LoggerService,
  ) {}

  public async calculateShippingCost(
    shippingId: string,
    params: CalculateShippingDto,
  ) {
    try {
      this.logger.info(
        `💰 Calculating shipping cost for ${params.fromCity} → ${params.toCity}`,
        'ShippingService',
      );

      const shipping = await this.prisma.replica.shipping.findUnique({
        where: { id: shippingId },
      });

      if (!shipping) throw new NotFoundException('Shipping method not found.');

      if (!shipping.isActive)
        throw new BadRequestException('Shipping method is not active.');

      if (
        shipping.minOrder &&
        params.orderAmount &&
        params.orderAmount < Number(shipping.minOrder)
      )
        throw new BadRequestException(
          `Minimum order amount for this shipping is ${shipping.minOrder}.`,
        );

      if (
        shipping.freeAbove &&
        params.orderAmount &&
        params.orderAmount >= Number(shipping.freeAbove)
      ) {
        return {
          cost: 0,
          estimatedDays: shipping.estimatedDays,
          provider: shipping.provider,
          isFree: true,
        };
      }

      const provider = this.shippingFactory.create(shipping.provider);
      const result = await provider.calculateCost({
        fromCity: params.fromCity,
        toCity: params.toCity,
        weight: params.weight,
      });

      return {
        ...result,
        shippingId: shipping.id,
        shippingName: shipping.name,
        isFree: false,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in calculate shipping cost: ${message}`,
        'ShippingService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async createShipment(orderId: string, dto: CreateShippingDto) {
    try {
      this.logger.info(
        `📦 Creating shipment for order: ${orderId}`,
        'ShippingService',
      );

      const order = await this.prisma.replica.order.findUnique({
        where: { id: orderId },
        include: {
          address: true,
          shipping: true,
        },
      });

      if (!order) throw new NotFoundException('Order not found.');

      if (!order.shipping)
        throw new BadRequestException('Order has no shipping method.');
      if (!order.shippingId)
        throw new BadRequestException('Order has no shipping method.');

      const provider = this.shippingFactory.create(order.shipping.provider);

      const result = await provider.createShipment({
        orderId: order.id,
        from: dto,
        to: {
          name: order.address.fullname,
          phone: order.address.phone,
          province: order.address.province,
          city: order.address.city,
          address: order.address.address,
          postalCode: order.address.postalCode,
        },
        weight: 1000, // TODO: Calculate From Items
        cost: Number(order.shippingCost),
      });

      const shipment = await this.prisma.master.shipment.create({
        data: {
          orderId: order.id,
          shippingId: order.shippingId,
          trackingCode: result.trackingCode,
          status: 'CONFIRMED',
          cost: Number(order.shippingCost),
          providerResponse: result.providerResponse,
        },
      });

      await this.prisma.master.order.update({
        where: { id: order.id },
        data: {
          trackingCode: result.trackingCode,
        },
      });

      this.logger.info(
        `✅ Shipment created: ${shipment.id} (tracking: ${result.trackingCode})`,
        'ShippingService',
      );

      return shipment;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in create shipment: ${message}`,
        'ShippingService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async trackShipment(trackingCode: string) {
    try {
      this.logger.info(
        `🔍 Tracking shipment: ${trackingCode}`,
        'ShippingService',
      );

      const shipment = await this.prisma.replica.shipment.findUnique({
        where: { trackingCode },
        include: { shipping: true },
      });

      if (!shipment) {
        throw new NotFoundException('Shipment not found.');
      }

      const provider = this.shippingFactory.create(shipment.shipping.provider);
      const result = await provider.trackShipment(trackingCode);
      const providerResponse = JSON.parse(JSON.stringify(result));

      await this.prisma.master.shipment.update({
        where: { id: shipment.id },
        data: {
          status: result.status as ShipmentStatus,
          providerResponse,
        },
      });

      return result;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Unexpected error in track shipment: ${message}`,
        'ShippingService',
      );
      throw new InternalServerErrorException('Internal Server Error ❌.');
    }
  }

  public async findAllShippings() {
    return this.prisma.replica.shipping.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
