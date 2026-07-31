import { Injectable } from '@nestjs/common';
import { RefreshTokenService } from '../../services/refresh-token/refresh-token.service';
import { VerifyCodeService } from '../../services/verify-code/verify-code.service';
import { NotificationService } from '../../services/notification/notification.service';

@Injectable()
export class CleanUpJob {
  constructor(
    private refreshTokenService: RefreshTokenService,
    private verifyCodeService: VerifyCodeService,
    private notificationService: NotificationService,
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
}
