import { Injectable } from '@nestjs/common';
import { RefreshTokenService } from '../../services/refresh-token/refresh-token.service';
import { VerifyCodeService } from '../../services/verify-code/verify-code.service';
import { NotificationService } from '../../services/notification/notification.service';
import { ProductService } from '../../../modules/product/product.service';
import { TicketService } from '../../../modules/ticket/ticket.service';
import { DiscountService } from '../../../modules/discount/discount.service';

@Injectable()
export class CleanUpJob {
  constructor(
    private refreshTokenService: RefreshTokenService,
    private verifyCodeService: VerifyCodeService,
    private notificationService: NotificationService,
    private productService: ProductService,
    private ticketService: TicketService,
    private discountService: DiscountService
  ) {}

  public async cleanUpRefreshTokens() {
    await this.refreshTokenService.cleanUp(30);
    return true;
  }

  public async cleanUpVerifyCode() {
    await this.verifyCodeService.cleanUpExpiredCodes(7);
    return true;
  }

  public async cleanUpNotifications() {
    await this.notificationService.removeOldNotificationsSmartStructured(30);
    return true;
  }

  public async cleanupProducts () {
    await this.productService.cleanupDeletedProducts()
    return true
  }

  public async cleanupTickets () {
    await this.ticketService.cleanupDeletedTickets()
    return true
  }

  public async cleanupDiscounts () {
    await this.discountService.cleanupExpiredDiscounts()
    return true
  }
}
