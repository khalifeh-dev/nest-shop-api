import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWTPayload, UserDataSummary } from '../types/jwt.type';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(configService: ConfigService) {
    const accessTokenSecretKey = configService.get<string>('JWT_ACCESS_SECRET_KEY');
    if (!accessTokenSecretKey)
      throw new Error('JWT Access Secret Key Is Not Defined ❌.');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: accessTokenSecretKey,
    });
  }

  public async validate({
    id,
    firstName,
    lastName,
    email,
    userName,
    role
  }: JWTPayload): Promise<UserDataSummary> {
    return { sub: id, firstName, lastName, email, userName, role };
  }
}
