import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { SignUpDto } from './dto/sign-up.dto';
import { UserService } from '../user/user.service';
import { RefreshTokenService } from '../refresh-token/refresh-token.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshToken, UserStatus } from '@prisma/client';
import { SignInDto } from './dto/sign-in.dto';
import { EncryptionService } from '../../common/services/encryption/encryption.service';
import { DeviceDto } from './dto/device.dto';
import { LogOut } from '../../common/constants/auth.constant';
import type { LoggerService } from '../../common/services/logger/logger-options.interface';

@Injectable()
export class AuthService {

  private _read;
  private _write;

  constructor(
    private prisma: DatabaseService,
    private userService: UserService,
    private refreshTokenService: RefreshTokenService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private encryption: EncryptionService,
    @Inject('LoggerService') private logger: LoggerService
  ) {
    this._read = this.prisma.replica
    this._write = this.prisma.master
  }

  public async signUp(dto: SignUpDto & DeviceDto) {
    const userData = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: dto.password,
      confirmPassword: dto.confirmPassword,
    };

    const createUser = await this.userService.create(userData);

    const { id, firstName, lastName, email, userName } = createUser;

    const payload = {
      id,
      firstName,
      lastName,
      email,
      userName,
    };

    const { userAgent, ip, deviceName, deviceType } = dto;

    const refreshToken = await this.refreshTokenService.createRefreshToken(id, {
      userAgent,
      ip,
      deviceName,
      deviceType,
    });

    const updateUser = await this.userService.updateRefreshToken(
      id,
      refreshToken.id,
    );

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET_KEY'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') || '15m',
    });

    return {
      user: updateUser,
      tokens: {
        accessToken,
        refreshToken: refreshToken.token,
      },
      deviceInfo: {
        deviceId: refreshToken.deviceId
      }
    };
  }

  public async signIn(dto: SignInDto) {
    const findUser = await this.userService.findOneByEmail(dto.email);

    if (findUser.userStatus !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Your Account Is Inactive Or Ban. Please Contact Support.',
      );
    }

    const checkPassowrd = await this.encryption.verifyHash(
      findUser?.password,
      dto.password,
    );

    if (!checkPassowrd)
      throw new BadRequestException('Email Or Password Is Wrong .');

    const { id, firstName, lastName, email, userName } = findUser;

    const payload = {
      id,
      firstName,
      lastName,
      email,
      userName,
    };

    const { userAgent, ip, deviceName, deviceType } = dto;

    const refreshToken = await this.refreshTokenService.createRefreshToken(id, {
      userAgent,
      ip,
      deviceName,
      deviceType,
    });

    const updateUser = await this.userService.updateRefreshToken(
      id,
      refreshToken.id,
    );

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET_KEY'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') || '15m',
    });

    return {
      user: updateUser,
      tokens: {
        accessToken,
        refreshToken: refreshToken.token,
      },
      deviceInfo: {
        deviceId: refreshToken.deviceId
      }
    };
  }

  public async signOut(userId: string, deviceId?: string) {
    await this.userService.secureFindOne(userId)

    if (deviceId) {
      return await this.refreshTokenService.revokeToken(userId, deviceId);
    }

    const token = await this._read.refreshToken.findFirst({
      where: {
        userId,
        isRevoked: false,
      },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        deviceInfo: true,
        id: true,
      },
    });

    if (!token) {
      throw new NotFoundException('No active token found for this user');
    }

    await this._write.refreshToken.update({
      where: { id: token.id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: LogOut.USER_LOGOUT,
      },
    });

    return {
      message: 'Logged out successfully',
      deviceInfo: token.deviceInfo || 'Unknown',
    };
  }

  public async signOutAll(userId: string) {
    await this.userService.secureFindOne(userId);
    return await this.refreshTokenService.revokeAllTokensByDevice(userId);
  }

  public async signOutDevice(userId: string, deviceId?: string) {
    await this.userService.secureFindOne(userId)
    if (!deviceId) throw new BadRequestException('Device ID is required');

    return await this.refreshTokenService.revokeToken(userId, deviceId);
  }

  //! Fix Use Transcation Bug !// 
  public async refresh(
    providedRefreshToken: string,
    deviceDto: DeviceDto,
  ) {
    let payload;
    const deviceId = this.refreshTokenService.generateDeviceId(deviceDto)

    try {
      payload = this.jwtService.verify(providedRefreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET_KEY'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const userId = payload?.sub;
    const user = await this.userService.findOne(userId);

    const hashedToken = await this.encryption.hash(providedRefreshToken);

    const existingToken = await this._read.refreshToken.findFirst({
      where: {
        userId,
        token: hashedToken,
        isRevoked: false,
        expiresAt: { gt: new Date() },
        ...(deviceId && { deviceId }),
      },
      select: {
        id: true,
        deviceId: true,
        deviceInfo: true,
      },
    });

    if (!existingToken)
      throw new UnauthorizedException(
        'Refresh token not found or already revoked',
      );

    const result = await this.prisma.transaction(async (prisma) => {
      await prisma.refreshToken.update({
        where: { id: existingToken.id },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'TOKEN_REFRESHED',
        },
      });

      await prisma.refreshToken.updateMany({
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

      const newRefreshToken = await this.refreshTokenService.createRefreshToken(
        userId,
        deviceDto,
      );

      await this.userService.updateRefreshToken(userId, newRefreshToken.id);

      return newRefreshToken;
    });

    const accessPayload = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      userName: user.userName,
      // role: user?.role,
    };

    const newAccessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.get('JWT_ACCESS_SECRET_KEY'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') || '15m',
    });

    return {
      user,
      accessToken: newAccessToken,
      refreshToken: result.token,
    };
  }
}
