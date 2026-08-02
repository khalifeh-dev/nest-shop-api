import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { DeviceInfo } from '../../types/device-info.type';
import { JwtService } from '@nestjs/jwt';
import { EncryptionService } from '../encryption/encryption.service';
import { UserService } from '../../../modules/user/user.service';
import { ConfigService } from '@nestjs/config';
import { LogOut } from '../../constants/auth.constant';
import { ErrorUtil } from '../../utils/error.util';
import type { LoggerService } from '../logger/logger-options.interface';

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
    @Inject('LoggerService') private logger: LoggerService,
  ) {
    this._read = this.prisma.replica;
    this._write = this.prisma.master;
  }

  public async createRefreshToken(userId: string, deviceInfo: DeviceInfo) {
    try {
      this.logger.info(
        `🔄 Creating refresh token for user: ${userId}, device: ${deviceInfo.deviceName || 'Unknown'}`,
        'RefreshTokenService',
      );
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
        this.logger.info(
          `🗑️ Revoked oldest token for device ${deviceId} (${existingTokens.length} tokens exceeded)`,
          'RefreshTokenService',
        );
      }

      const expiredResult = await this._write.refreshToken.updateMany({
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

      if (expiredResult.count > 0) {
        this.logger.info(
          `🗑️ Revoked ${expiredResult.count} expired tokens for user: ${userId}`,
          'RefreshTokenService',
        );
      }

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

      if (!user) {
        this.logger.warn(
          `⚠️ User not found for refresh token: ${userId}`,
          'RefreshTokenService',
        );
        throw new NotFoundException(`User Not Found With ID ${userId} ❌.`);
      }

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

      this.logger.info(
        `✅ Refresh token created for user: ${userId}, device: ${deviceInfo.deviceName || 'Unknown'}`,
        'RefreshTokenService',
      );

      return {
        token: newToken,
        id: token.id,
        deviceId,
      };
    } catch (error) {
      const message = ErrorUtil.getMessage(error);

      this.logger.error(
        `❌ Failed to create refresh token for user: ${userId}, device: ${deviceInfo.deviceName || 'Unknown'}, error: ${message}`,
        'RefreshTokenService',
      );

      throw error;
    }
  }

  public async revokeToken(userId: string, deviceId: string) {
    try {
      this.logger.info(
        `🔑 Revoking token for user: ${userId}, device: ${deviceId.substring(0, 8)}...`,
        'RefreshTokenService',
      );
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

      if (result.count === 0) {
        this.logger.warn(
          `⚠️ No active token found for user: ${userId}, device: ${deviceId.substring(0, 8)}...`,
          'RefreshTokenService',
        );
        throw new NotFoundException('No Active Token Found For This Device.');
      }

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

      this.logger.info(
        `✅ Token revoked successfully for user: ${userId}, device: ${token?.deviceInfo || 'Unknown'}, tokens revoked: ${result.count}`,
        'RefreshTokenService',
      );

      return {
        message: 'Token Revoked Successfully.',
        deviceInfo: token?.deviceInfo || 'Unknown',
        count: result.count,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Failed to revoke token for user: ${userId}, device: ${deviceId.substring(0, 8)}...: ${message}`,
        'RefreshTokenService',
      );
      throw new InternalServerErrorException('Error In Revoke Token.');
    }
  }

  public async revokeAllTokensByDevice(userId: string) {
    try {
      this.logger.info(
        `🔑 Revoking all tokens for user: ${userId}`,
        'RefreshTokenService',
      );

      await this.userService.findOne(userId);

      const result = await this._write.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: LogOut.USER_LOGOUT,
        },
      });

      this.logger.info(
        `✅ All tokens revoked for user: ${userId}, tokens revoked: ${result.count}`,
        'RefreshTokenService',
      );

      return {
        message: `Revoked ${result.count} Tokens For User.`,
        count: result.count,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Failed to revoke token for user: ${userId}, error: ${message}`,
        'RefreshTokenService',
      );
      throw new InternalServerErrorException('Error In Revoke Token.');
    }
  }

  public async revokeTokenById(tokenId: string) {
    try {
      this.logger.info(
        `🔑 Revoking token by ID: ${tokenId.substring(0, 8)}...`,
        'RefreshTokenService',
      );

      await this.findOneToken(tokenId);

      const result = await this._write.refreshToken.update({
        where: { id: tokenId },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: LogOut.DEVICE_LOGOUT,
        },
      });

      this.logger.info(
        `✅ Token revoked successfully by ID: ${tokenId.substring(0, 8)}...`,
        'RefreshTokenService',
      );

      return result;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Failed to revoke token: ${message}`,
        'RefreshTokenService',
      );
      throw new InternalServerErrorException('Error In Revoke Token.');
    }
  }

  public async findOneToken(tokenId: string) {
    try {
      this.logger.info(`🔍 Find token with: ${tokenId}`, 'RefreshTokenService');

      const token = await this._write.refreshToken.findUnique({
        where: { id: tokenId },
      });

      if (!token) {
        this.logger.warn(`⚠️ Token not found`, 'RefreshTokenService');
        throw new NotFoundException('Token Not Found.');
      }

      return token;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `❌ Failed find token: ${message}`,
        'RefreshTokenService',
      );
      throw new InternalServerErrorException('Error In Revoke Token.');
    }
  }

  public generateDeviceId(info: DeviceInfo): string {
    const deviceName = info.deviceName || 'Unknown';
    const browser = info.userAgent?.split('/')[0]?.trim() || 'Unknown';

    return `${deviceName}-${browser}`;
  }

  public async cleanUp(
    olderThanDays: number = 30,
  ): Promise<{ deletedCount: number }> {
    try {
      this.logger.info(
        `✅ Cleaning old & expired tokens`,
        'RefreshTokenService',
      );
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.prisma.master.refreshToken.deleteMany({
        where: {
          isRevoked: true,
          updatedAt: { lt: cutoffDate },
        },
      });

      const expiredResult = await this.prisma.master.refreshToken.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
          isRevoked: false,
        },
      });

      const totalDeleted = result.count + expiredResult.count;

      this.logger.info(
        `✅ Cleaning ${totalDeleted} tokens successfuly`,
        'RefreshTokenService',
      );

      return { deletedCount: totalDeleted };
    } catch (error) {
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `⛔ Error in cleanup refresh tokens: ${message}`,
        'RefreshTokenService',
      );
      throw new InternalServerErrorException(
        'Internal Server Error (RefreshToken<CleanUp>) ❌.',
      );
    }
  }
}
