// src/modules/shipping/providers/tipax.provider.ts
import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  ShippingProvider,
  ShippingCostParams,
  ShippingCostResult,
  CreateShipmentParams,
  CreateShipmentResult,
  TrackShipmentResult,
} from '../interface/shipping-provider.interface';

@Injectable()
export class TipaxProvider implements ShippingProvider {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'TIPAX_BASE_URL',
      'https://api.tipax.ir/v1',
    );
    this.username = this.configService.getOrThrow<string>('TIPAX_USERNAME');
    this.password = this.configService.getOrThrow<string>('TIPAX_PASSWORD');
  }

  private async getToken(): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/auth/login`, {
          username: this.username,
          password: this.password,
        }),
      );
      return response.data.token;
    } catch (error) {
      throw new InternalServerErrorException('Tipax authentication failed');
    }
  }

  async calculateCost(params: ShippingCostParams): Promise<ShippingCostResult> {
    try {
      const token = await this.getToken();

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/pricing`,
          {
            origin: params.fromCity,
            destination: params.toCity,
            weight: params.weight,
            serviceType: 'STANDARD',
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
      );

      return {
        cost: response.data.price,
        estimatedDays: response.data.estimatedDays,
        provider: 'TIPAX',
        metadata: response.data,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to calculate Tipax cost');
    }
  }

  async createShipment(
    params: CreateShipmentParams,
  ): Promise<CreateShipmentResult> {
    try {
      const token = await this.getToken();

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/shipments`,
          {
            orderId: params.orderId,
            sender: {
              name: params.from.name,
              phone: params.from.phone,
              address: `${params.from.province}، ${params.from.city}، ${params.from.address}`,
              postalCode: params.from.postalCode,
            },
            receiver: {
              name: params.to.name,
              phone: params.to.phone,
              address: `${params.to.province}، ${params.to.city}، ${params.to.address}`,
              postalCode: params.to.postalCode,
            },
            weight: params.weight,
            cost: params.cost,
            description: params.description,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
      );

      return {
        trackingCode: response.data.trackingCode,
        status: 'CONFIRMED',
        estimatedDelivery: response.data.estimatedDelivery
          ? new Date(response.data.estimatedDelivery)
          : undefined,
        providerResponse: response.data,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to create Tipax shipment');
    }
  }

  async trackShipment(trackingCode: string): Promise<TrackShipmentResult> {
    try {
      const token = await this.getToken();

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/track/${trackingCode}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );

      return {
        trackingCode,
        status: response.data.status,
        history: response.data.history.map((item: any) => ({
          status: item.status,
          location: item.location,
          timestamp: new Date(item.timestamp),
          description: item.description,
        })),
        estimatedDelivery: response.data.estimatedDelivery
          ? new Date(response.data.estimatedDelivery)
          : undefined,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to track Tipax shipment');
    }
  }

  async cancelShipment(trackingCode: string): Promise<boolean> {
    try {
      const token = await this.getToken();

      await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/shipments/cancel`,
          { trackingCode },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
      );

      return true;
    } catch (error) {
      return false;
    }
  }
}
