import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWTPayload, UserDataSummary } from '../types/jwt.type';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    const refreshTokenSecretKey = configService.get<string>(
      'JWT_REFRESH_SECRET_KEY',
    );
    if (!refreshTokenSecretKey)
      throw new Error('JWT Refresh Secret Key Is Not Defined ❌.');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: refreshTokenSecretKey,
    });
  }

  public async validate({
    id,
    firstName,
    lastName,
    email,
    userName,
    role,
  }: JWTPayload): Promise<UserDataSummary> {
    return { sub: id, firstName, lastName, email, userName, role };
  }
}
