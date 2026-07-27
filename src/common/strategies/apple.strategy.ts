import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get('APPLE_CLIENT_ID'),
      teamID: configService.get('APPLE_TEAM_ID'),
      keyID: configService.get('APPLE_KEY_ID'),
      privateKeyLocation: configService.get('APPLE_PRIVATE_KEY_PATH'),
      callbackURL: configService.get('APPLE_CALLBACK_URL'),
      scope: ['name', 'email'],
    });
  }

  public async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { email, name } = profile;

    const user = {
      email,
      firstName: name?.firstName || '',
      lastName: name?.lastName || '',
      appleId: profile.id,
      authProvider: 'APPLE',
      isVerified: true,
    };

    return done(null, user);
  }
}