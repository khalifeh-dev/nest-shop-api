import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { DeviceInfo } from '../../common/types/device-info.type';
import { RefreshToken } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { EncryptionService } from '../../common/services/encryption/encryption.service';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RefreshTokenService {
  constructor(
    private prisma: DatabaseService,
    private jwtService: JwtService,
    private encryption: EncryptionService,
    private configService: ConfigService,
    private userService: UserService,
  ) {}

  public async createRefreshToken(
    userId: string,
    deviceInfo: DeviceInfo,
  ): Promise<RefreshToken> {
    const maxTokensPerDevice =
      this.configService.get<number>('MAX_TOKENS_PER_DEVICE') || 3;
    const deviceId = await this.generateDeviceId(deviceInfo);

    const existingTokens = await this.prisma.replica.refreshToken.findMany({
      where: { userId, deviceId, isRevoked: false },
      orderBy: { lastUsedAt: 'desc' },
    });

    if (existingTokens.length >= maxTokensPerDevice) {
      const oldestToken = existingTokens[existingTokens.length - 1];
      await this.prisma.master.refreshToken.update({
        where: { id: oldestToken.id },
        data: { isRevoked: true },
      });
    }

    const user = await this.prisma.replica.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        userName: true,
        // role: true,
      },
    });

    if (!user)
      throw new NotFoundException(`User Not Found With ID ${userId} ❌.`);

    const newToken = this.jwtService.sign(user, {
      secret: this.configService.get('JWT_REFRESH_SECRET_KEY'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') || '14d',
    });

    const hashedToken = await this.encryption.hash(newToken);

    return await this.prisma.master.refreshToken.create({
      data: {
        token: hashedToken,
        userId,
        deviceId,
        deviceInfo: deviceInfo.deviceName,
        ipAddress: deviceInfo.ip,
        deviceType: deviceInfo.deviceType,
        userAgent: deviceInfo.userAgent,
        expiresAt: new Date(Date.now() + 604_800_000), // 7 * 24 * 60 * 60 * 1000 -> 7D
      },
    });
  }

  private async generateDeviceId(info: DeviceInfo): Promise<string> {
    const id = `${info.userAgent}-${info.ip}`;
    return await this.encryption.hash(id);
  }
}
