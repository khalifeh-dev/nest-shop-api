import {
  BadRequestException,
  Injectable,
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

@Injectable()
export class AuthService {
  constructor(
    private prisma: DatabaseService,
    private userService: UserService,
    private refreshTokenService: RefreshTokenService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private encryption: EncryptionService,
  ) {}

  public async signUp(dto: DeviceDto) {
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

    const refreshToken =
      await this.refreshTokenService.createRefreshToken(id, {
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
    };
  }

  public async signIn(dto: DeviceDto) {
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

    const refreshToken =
      await this.refreshTokenService.createRefreshToken(id, {
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
    };
  }
}
