import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { DeviceInfo } from '../../common/types/device-info.type';
import type { Request, Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeviceUtil } from '../../common/utils/device.util';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  @ApiOperation({ summary: 'Register a user' })
  @HttpCode(HttpStatus.CREATED)
  public async signUp(
    dto: CreateUserDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { userAgent, ip, deviceName, deviceType } =
      DeviceUtil.extractDeviceInfo(req);

    const clientData: DeviceInfo = {
      userAgent,
      ip,
      deviceName,
      deviceType,
    };

    const { user, tokens } = await this.authService.signUp({
      ...dto,
      ...clientData,
    });

    res.cookie('access-token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 900_000, // 15M
    });

    res.cookie('refresh-token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1_209_600, // 14D
    });

    return {
      user,
    };
  }

}
