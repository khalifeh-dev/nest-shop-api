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
import { RefreshTokenService } from '../../common/services/refresh-token/refresh-token.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthProvider, RefreshToken, UserStatus } from '@prisma/client';
import { SignInDto } from './dto/sign-in.dto';
import { EncryptionService } from '../../common/services/encryption/encryption.service';
import { DeviceDto } from './dto/device.dto';
import { LogOut } from '../../common/constants/auth.constant';
import type { LoggerService } from '../../common/services/logger/logger-options.interface';
import { OAuthUser } from '../../common/types/oauth.type';

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
    @Inject('LoggerService') private logger: LoggerService,
  ) {
    this._read = this.prisma.replica;
    this._write = this.prisma.master;
  }

  public async signUp(dto: SignUpDto & DeviceDto) {
    this.logger.info(
      `🧱 Sign up user: ${dto.firstName} ${dto.lastName} (${dto.email})`,
      'AuthService',
    );

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

    this.logger.info(`🔑 Create refresh token for user: ${id}`, 'AuthService');

    const updateUser = await this.userService.updateRefreshToken(
      id,
      refreshToken.id,
    );

    this.logger.info(`🔐 Add refresh token to user`, 'AuthService');

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET_KEY'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') || '15m',
    });

    this.logger.info(`🔐 Create access token for user: ${id}`, 'AuthService');

    return {
      user: updateUser,
      tokens: {
        accessToken,
        refreshToken: refreshToken.token,
      },
      deviceInfo: {
        deviceId: refreshToken.deviceId,
      },
    };
  }

  public async signIn(dto: SignInDto) {
    this.logger.info(`🧱 Sign in user: ${dto.email}`, 'AuthService');

    const findUser = await this.userService.findOneByEmail(dto.email);

    if (findUser.userStatus !== UserStatus.ACTIVE) {
      this.logger.info(`🗡️ User has not already active`, 'AuthService');
      throw new UnauthorizedException(
        'Your Account Is Inactive Or Ban. Please Contact Support.',
      );
    }

    if (!findUser.password) {
      this.logger.warn(
        `⚠️ User does not have a password because this user already logined with (Google, Github, apple)`,
        'AuthService',
      );
      throw new UnauthorizedException(
        'This account uses social login (Google, GitHub, etc.). Please use that method to sign in.',
      );
    }

    const checkPassowrd = await this.encryption.verifyHash(
      findUser?.password,
      dto.password,
    );

    if (!checkPassowrd) {
      this.logger.warn(`⚠️ User password isn't match with DTO`, 'AuthService');
      throw new BadRequestException('Email Or Password Is Wrong .');
    }

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

    this.logger.info(
      `🔑 Create a new refresh token for user: ${email}`,
      'AuthService',
    );

    const updateUser = await this.userService.updateRefreshToken(
      id,
      refreshToken.id,
    );

    this.logger.info(
      `🔧 Add new refresh token to user: ${email}`,
      'AuthService',
    );

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET_KEY'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') || '15m',
    });

    this.logger.info(
      `🔐 Create new access token for user: ${id}`,
      'AuthService',
    );

    return {
      user: updateUser,
      tokens: {
        accessToken,
        refreshToken: refreshToken.token,
      },
      deviceInfo: {
        deviceId: refreshToken.deviceId,
      },
    };
  }

  public async signOut(userId: string, deviceId?: string) {
    this.logger.info(`🪓 Sign out user: ${userId}`, 'AuthService');

    await this.userService.secureFindOne(userId);

    if (deviceId) {
      this.logger.warn(
        `🗡️ Revoke user refresh token by device id`,
        'AuthService',
      );
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
      this.logger.warn(`⚠️ User doesn't have a token`, 'AuthService');
      throw new NotFoundException('No active token found for this user');
    }

    await this.refreshTokenService.revokeTokenById(token.id);

    this.logger.info(
      `🗡️ Revoke user refresh token without device id`,
      'AuthService',
    );

    return {
      message: 'Logged out successfully',
      deviceInfo: token.deviceInfo || 'Unknown',
    };
  }

  public async signOutAll(userId: string) {
    this.logger.info(`🪓 Sign out all user ${userId} device`, 'AuthService');
    await this.userService.secureFindOne(userId);
    return await this.refreshTokenService.revokeAllTokensByDevice(userId);
  }

  public async signOutDevice(userId: string, deviceId: string) {
    this.logger.info(`🗡️ Sign out with a device by ${userId}`, 'AuthService');
    await this.userService.secureFindOne(userId);
    if (!deviceId) {
      this.logger.warn(`⚠️ Device id is require`, 'AuthService');
      throw new BadRequestException('Device ID is required');
    }

    return await this.refreshTokenService.revokeToken(userId, deviceId);
  }
  
  public async refresh(providedRefreshToken: string, deviceDto: DeviceDto) {
    this.logger.info(`🔄️ Refresh user token`, 'AuthService');

    let payload;
    const deviceId = this.refreshTokenService.generateDeviceId(deviceDto);
    
    try {
      payload = this.jwtService.verify(providedRefreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET_KEY'),
      });
      this.logger.info(`🔑 Token own is user: ${payload?.sub}`, 'AuthService');

      const userId = payload?.sub || payload?.id;
      const user = await this.userService.secureFindOne(userId);
      const hashedToken = this.encryption.hashToken(providedRefreshToken);
      const existingToken = await this.prisma.replica.refreshToken.findFirst({
        where: {
          userId,
          token: hashedToken,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" }
      });

      if (!existingToken) {
        this.logger.warn(
          `⚠️ Refresh token not found or revoked for user: ${userId}`,
          'AuthService',
        );
        throw new UnauthorizedException(
          'Refresh token not found or already revoked',
        );
      }

    const newRefreshToken = await this.refreshTokenService.createRefreshToken(
      userId,
      deviceDto,
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

      await this.userService.updateRefreshToken(userId, newRefreshToken.id);
      return newRefreshToken;
    });

      this.logger.info(
        `✅ Create a new refresh token for user: ${user.id}`,
        'AuthService',
      );

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

      this.logger.info(
        `✅ Create a new access token for user: ${user.id}`,
        'AuthService',
      );

      return {
        user,
        accessToken: newAccessToken,
        refreshToken: result.token,
      };
    } catch (error) {
      this.logger.warn(`🔐 Invalid refresh token attempt`, 'AuthService');
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }

  public async OAuth(dto: OAuthUser, deviceInfo: DeviceDto) {
    this.logger.info(`🔗 User login with oauth`, 'AuthService');
    let user = await this.findOAuthUser(dto);

    if (!user) {
      this.logger.warn(`⚠️ User not found`, 'AuthService');
      user = await this.createOAuthUser(dto);
    }

    const refreshToken = await this.refreshTokenService.createRefreshToken(
      user.id,
      deviceInfo,
    );

    this.logger.info(
      `✅ Create a new refresh token for user: ${user.id}`,
      'AuthService',
    );
    await this.userService.updateRefreshToken(user.id, refreshToken.id);
    const payload = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      userName: user.userName,
      // role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET_KEY'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') || '15m',
    });

    this.logger.info(
      `✅ Create a new access token for user: ${user.id}`,
      'AuthService',
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userName: user.userName,
        avatar: user.avatar,
        bio: user.bio,
      },
      tokens: {
        accessToken,
        refreshToken: refreshToken.token,
      },
    };
  }

  public async findOAuthUser(oAuthUser: OAuthUser) {
    this.logger.info(`🔍 Find user provider`, 'AuthService');
    const where: any = {};

    if (oAuthUser.googleId) {
      where.googleId = oAuthUser.googleId;
      this.logger.info(`🔑 User provider is google`, 'AuthService');
    } else if (oAuthUser.githubId) {
      where.githubId = oAuthUser.githubId;
      this.logger.info(`🔑 User provider is github`, 'AuthService');
    } else if (oAuthUser.appleId) {
      where.appleId = oAuthUser.appleId;
      this.logger.info(`🔑 User provider is apple`, 'AuthService');
    } else {
      this.logger.warn(
        `⚠️ The user does not have a provider and may have logged in using an email address.`,
        'AuthService',
      );
      where.email = oAuthUser.email;
    }

    return this.prisma.replica.user.findFirst({
      where,
    });
  }

  private async createOAuthUser(oAuthUser: OAuthUser) {
    const userName = this.generateUserName(
      oAuthUser.firstName,
      oAuthUser.lastName,
    );

    return this.prisma.master.user.create({
      data: {
        email: oAuthUser.email,
        firstName: oAuthUser.firstName,
        lastName: oAuthUser.lastName,
        userName,
        avatar: oAuthUser.avatar,
        googleId: oAuthUser.googleId,
        githubId: oAuthUser.githubId,
        appleId: oAuthUser.appleId,
        isVerified: oAuthUser.isVerified,
        userStatus: 'ACTIVE',
        password: null,
      },
    });
  }

  private generateUserName(firstName: string, lastName: string): string {
    const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    const random = Math.floor(Math.random() * 10000);
    return `${base}${random}`;
  }
}
