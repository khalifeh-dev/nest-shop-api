import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { InternalProvider } from './providers/internal.provider';
import { ShippingFactory } from './factory/shipping.factory';
import { TipaxProvider } from './providers/tipax.provider';

@Module({  imports: [
    
    HttpModule, 
    ConfigModule,
  ],
  controllers: [ShippingController],
  providers: [
    ShippingService,
    ShippingFactory,
    InternalProvider,
    TipaxProvider,
    // PostProvider,
  ],
  exports: [ShippingService],
})
export class ShippingModule {}
