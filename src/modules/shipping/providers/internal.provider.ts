import { Injectable } from '@nestjs/common';
import {
  ShippingProvider,
  ShippingCostParams,
  ShippingCostResult,
  CreateShipmentParams,
  CreateShipmentResult,
  TrackShipmentResult,
} from '../interface/shipping-provider.interface';
import { DatabaseService } from '../../../common/database/database.service';

@Injectable()
export class InternalProvider implements ShippingProvider {
  constructor(private prisma: DatabaseService) {}

  public async calculateCost(
    params: ShippingCostParams,
  ): Promise<ShippingCostResult> {
    const shipping = await this.prisma.replica.shipping.findFirst({
      where: { provider: 'INTERNAL', isActive: true },
    });

    if (!shipping) {
      return { cost: 0, estimatedDays: 0, provider: 'INTERNAL' };
    }

    const cost = Number(shipping.cost) || 0;
    const estimatedDays = shipping.estimatedDays;

    return {
      cost,
      estimatedDays,
      provider: 'INTERNAL',
    };
  }

  public async createShipment(
    params: CreateShipmentParams,
  ): Promise<CreateShipmentResult> {
    const trackingCode = `INT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    return {
      trackingCode,
      status: 'CONFIRMED',
      providerResponse: { message: 'Internal shipment created' },
    };
  }

  public async trackShipment(
    trackingCode: string,
  ): Promise<TrackShipmentResult> {
    return {
      trackingCode,
      status: 'IN_TRANSIT',
      history: [
        {
          status: 'CONFIRMED',
          location: 'انبار',
          timestamp: new Date(),
          description: 'The shipment has been registered.',
        },
      ],
    };
  }
}
