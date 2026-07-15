import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { SignUpDto } from './dto/sign-up.dto';
import { UserService } from '../user/user.service';
import { RefreshTokenService } from '../refresh-token/refresh-token.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshToken } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: DatabaseService,
    private userService: UserService,
    private refreshTokenService: RefreshTokenService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  public async signUp(dto: SignUpDto) {
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

    const refreshToken: RefreshToken = await this.refreshTokenService.createRefreshToken(id, {
      userAgent,
      ip,
      deviceName,
      deviceType,
    });

    const updateUser = await this.userService.updateRefreshToken(id, refreshToken.id);

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
