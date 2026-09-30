export interface ShippingCostParams {
  fromCity: string;
  toCity: string;
  weight: number;
  orderAmount?: number;
}

export interface ShippingCostResult {
  cost: number;
  estimatedDays: number;
  provider: string;
  metadata?: Record<string, any>;
}

export interface CreateShipmentParams {
  orderId: string;
  from: {
    name: string;
    phone: string;
    province: string;
    city: string;
    address: string;
    postalCode: string;
  };
  to: {
    name: string;
    phone: string;
    province: string;
    city: string;
    address: string;
    postalCode: string;
  };
  weight: number;
  cost: number;
  description?: string;
}

export interface CreateShipmentResult {
  trackingCode: string;
  status: string;
  estimatedDelivery?: Date;
  providerResponse: any;
}

export interface TrackShipmentResult {
  trackingCode: string;
  status: string;
  history: Array<{
    status: string;
    location: string;
    timestamp: Date;
    description?: string;
  }>;
  estimatedDelivery?: Date;
}

export interface ShippingProvider {
  calculateCost(params: ShippingCostParams): Promise<ShippingCostResult>;
  createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult>;
  trackShipment(trackingCode: string): Promise<TrackShipmentResult>;
  cancelShipment?(trackingCode: string): Promise<boolean>;
}

export interface TrackShipmentResult {
  trackingCode: string;
  status: string;
  history: Array<{
    status: string;
    location: string;
    timestamp: Date;
    description?: string;
  }>;
  estimatedDelivery?: Date;
  [key: string]: any; 
}