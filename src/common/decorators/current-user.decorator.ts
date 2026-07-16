import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { UserDataSummary } from '../types/jwt.type';

export const CurrentUser = createParamDecorator(
  (data: keyof UserDataSummary | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserDataSummary;

    if (!user) {
      throw new UnauthorizedException('User Not Authenticated');
    }

    if (data) {
      return user[data];
    }

    return user;
  },
);
