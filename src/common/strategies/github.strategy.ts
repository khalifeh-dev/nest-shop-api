import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../modules/auth/auth.service';
import { VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const clientID = configService.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = configService.get<string>('GITHUB_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GITHUB_CALLBACK_URL');

    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error(
        'GitHub OAuth credentials are not configured in .env file',
      );
    }
    
    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['user:email'],
    });
  }

  public async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    const { username, emails, photos, displayName } = profile;

    const user = {
      email: emails?.[0]?.value || `${username}@github.com`,
      firstName: displayName?.split(' ')[0] || username,
      lastName: displayName?.split(' ')[1] || '',
      avatar: photos?.[0]?.value,
      githubId: profile.id,
      authProvider: 'GITHUB',
      isVerified: true,
    };

    return done(null, user);
  }
}
