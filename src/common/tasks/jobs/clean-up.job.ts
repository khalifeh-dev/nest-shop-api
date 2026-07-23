import { Injectable } from '@nestjs/common';
import { RefreshTokenService } from '../../../modules/refresh-token/refresh-token.service';

@Injectable()
export class CleanUpJob {
  constructor(private refreshTokenService: RefreshTokenService) {}

  public async cleanUpRefreshTokens() {
    return await this.refreshTokenService.cleanUp(30);
  }
}
