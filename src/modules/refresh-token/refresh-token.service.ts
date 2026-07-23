import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { DeviceInfo } from '../../common/types/device-info.type';
import { JwtService } from '@nestjs/jwt';
import { EncryptionService } from '../../common/services/encryption/encryption.service';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';
import { LogOut } from '../../common/constants/auth.constant';

@Injectable()
export class RefreshTokenService {

  private _read;
  private _write;

  constructor(
    private prisma: DatabaseService,
    private jwtService: JwtService,
    private encryption: EncryptionService,
    private configService: ConfigService,
    private userService: UserService,
  ) {
    this._read = this.prisma.replica
    this._write = this.prisma.master
  }

  public async createRefreshToken(userId: string, deviceInfo: DeviceInfo) {
    const maxTokensPerDevice =
      this.configService.get<number>('MAX_TOKENS_PER_DEVICE') || 3;
    const deviceId = this.generateDeviceId(deviceInfo);

    const existingTokens = await this._read.refreshToken.findMany({
      where: { userId, deviceId, isRevoked: false },
      orderBy: { createdAt: 'desc' },
    });

    if (existingTokens.length >= maxTokensPerDevice) {
      const oldestToken = existingTokens[existingTokens.length - 1];
      await this._write.refreshToken.update({
        where: { id: oldestToken.id },
        data: { isRevoked: true },
      });
    }

    await this._write.refreshToken.updateMany({
      where: {
        userId,
        expiresAt: { lt: new Date() },
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'TOKEN_EXPIRED',
      },
    });

    const user = await this._read.user.findUnique({
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

    const token = await this._write.refreshToken.create({
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

    return {
      token: newToken,
      id: token.id,
      deviceId
    };
  }

  public async revokeToken(userId: string, deviceId: string) {
    try {
      await this.userService.findOne(userId);
      const result = await this._write.refreshToken.updateMany({
        where: {
          userId,
          deviceId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: LogOut.USER_LOGOUT,
        },
      });

      if (result.count === 0)
        throw new NotFoundException('No Active Token Found For This Device.');

      const token = await this._read.refreshToken.findFirst({
        where: {
          userId,
          deviceId,
          isRevoked: true,
        },
        orderBy: { revokedAt: 'desc' },
        select: {
          deviceInfo: true,
        },
      });

      return {
        message: 'Token Revoked Successfully.',
        deviceInfo: token?.deviceInfo || 'Unknown',
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

      const result = await this._write.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: LogOut.USER_LOGOUT,
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
      await this.findOneToken(tokenId);

      return await this._write.refreshToken.update({
        where: { id: tokenId },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: LogOut.DEVICE_LOGOUT,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error In Revoke Token.');
    }
  }

  public async findOneToken(tokenId: string) {
    try {
      const token = await this._write.refreshToken.findUnique({
        where: { id: tokenId },
      });

      if (!token) throw new NotFoundException('Token Not Found.');

      return token;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error In Revoke Token.');
    }
  }

  public generateDeviceId(info: DeviceInfo): string {
    const deviceName = info.deviceName || 'Unknown';
    const browser = info.userAgent?.split('/')[0]?.trim() || 'Unknown';

    return `${deviceName}-${browser}`;
  }
}
