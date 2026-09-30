import { Injectable } from '@nestjs/common';
import { ShippingProvider as ShippingProviderEnum } from '@prisma/client';
import { ShippingProvider } from '../interface/shipping-provider.interface';
import { InternalProvider } from '../providers/internal.provider';
import { TipaxProvider } from '../providers/tipax.provider';
// import { PostProvider } from '../providers/post.provider';

@Injectable()
export class ShippingFactory {
  constructor(
    private internalProvider: InternalProvider,
    private tipaxProvider: TipaxProvider,
    // private postProvider: PostProvider,
  ) {}

  create(provider: ShippingProviderEnum): ShippingProvider {
    switch (provider) {
      case 'TIPAX':
        return this.tipaxProvider;
    //   case 'POST':
        // return this.postProvider;
      case 'INTERNAL':
      default:
        return this.internalProvider;
    }
  }
}