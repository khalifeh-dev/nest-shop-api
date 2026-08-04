import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokenExpiredError, JsonWebTokenError } from '@nestjs/jwt';
import { lastValueFrom, Observable } from 'rxjs';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
  constructor() {
    super();
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = await super.canActivate(context);

      const canActivate =
        result instanceof Observable ? await lastValueFrom(result) : result;

      if (!canActivate) {
        throw new UnauthorizedException('Authentication failed');
      }

      return canActivate;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException(
          'Refresh token has expired. Please login again.',
        );
      }

      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid refresh token signature.');
      }

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      console.error('JwtRefreshGuard error:', error);
      throw new UnauthorizedException('Refresh token is not valid.');
    }
  }

  public handleRequest(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ) {
    if (err || !user) {
      if (info instanceof TokenExpiredError) {
        throw new UnauthorizedException(
          'Refresh token has expired. Please login again.',
        );
      }

      if (info instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid refresh token signature.');
      }

      throw err || new UnauthorizedException('Refresh token is not valid.');
    }

    return user;
  }
}
