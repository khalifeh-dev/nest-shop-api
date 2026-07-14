import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { DeviceInfo } from '../../common/types/device-info.type';
import { RefreshToken } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { EncryptionService } from '../../common/services/encryption/encryption.service';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';
import { LogOut } from '../../common/constants/auth.constant';

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

  public async revokeToken(userId: string, deviceId: string) {
    try {
      await this.userService.findOne(userId);
      const result = await this.prisma.master.refreshToken.updateMany({
        where: {
          userId,
          deviceId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: LogOut.logOut,
        },
      });

      if (result.count === 0)
        throw new NotFoundException('No Active Token Found For This Device.');

      return {
        message: 'Token Revoked Successfully.',
        count: result.count,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error In Revoke Token.');
    }
  }

  public async revokeAllTokensByDevice(userId: string) {
    try {
      await this.userService.findOne(userId);

      const result = await this.prisma.master.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: LogOut.userLogOut,
        },
      });

      return {
        message: `Revoked ${result.count} Tokens For User.`,
        count: result.count,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error In Revoke Token.');
    }
  }

  public async revokeTokenById(tokenId: string) {
    try {
      await this.findOneToken(tokenId)

      return await this.prisma.master.refreshToken.update({
        where: { id: tokenId },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'MANUAL_REVOKE',
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error In Revoke Token.');
    }
  }

  public async findOneToken(tokenId: string) {
    try {
      const token = await this.prisma.master.refreshToken.findUnique({
        where: { id: tokenId },
      });

      if (!token) throw new NotFoundException('Token Not Found.');

      return token
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error In Revoke Token.');
    }
  }

  private async generateDeviceId(info: DeviceInfo): Promise<string> {
    const id = `${info.userAgent}-${info.ip}`;
    return await this.encryption.hash(id);
  }
}
