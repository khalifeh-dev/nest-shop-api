import { Injectable } from '@nestjs/common';
import { RefreshTokenService } from '../../../modules/refresh-token/refresh-token.service';
import { VerifyCodeService } from '../../services/verify-code/verify-code.service';

@Injectable()
export class CleanUpJob {
  constructor(
    private refreshTokenService: RefreshTokenService,
    private verifyCodeService: VerifyCodeService
  ) {}

  public async cleanUpRefreshTokens() {
    return await this.refreshTokenService.cleanUp(30);
  }

  public async cleanUpVerifyCode () {
    return await this.verifyCodeService.cleanUpExpiredCodes(7)
  }
}
