import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { JWTPayload, UserDataSummary } from '../types/jwt.type';
import type { Request } from "express"

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    const refreshTokenSecretKey = configService.get<string>(
      'JWT_REFRESH_SECRET_KEY',
    );
    if (!refreshTokenSecretKey)
      throw new Error('JWT Refresh Secret Key Is Not Defined ❌.');

    super({
      jwtFromRequest: (req: Request) => {
        return req.cookies?.['refresh-token'] || null;
      },
      ignoreExpiration: false,
      secretOrKey: refreshTokenSecretKey,
      passReqToCallback: true,
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
