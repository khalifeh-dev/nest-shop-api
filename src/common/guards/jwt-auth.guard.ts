import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TokenExpiredError, JsonWebTokenError } from '@nestjs/jwt';
import { lastValueFrom, Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-access') {
  constructor(private reflector: Reflector) {
    super();
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getClass(),
      context.getHandler(),
    ]);

    if (isPublic) {
      return true;
    }

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
          'Token has expired. Please login again.',
        );
      }

      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token signature.');
      }

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      console.error('JwtAuthGuard error:', error);
      throw new UnauthorizedException('Token is not valid.');
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
          'Token has expired. Please login again.',
        );
      }

      if (info instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token signature.');
      }

      throw err || new UnauthorizedException('Token is not valid.');
    }

    return user;
  }
}
