import {
  Body,
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
import { SignInDto } from './dto/sign-in.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  @ApiOperation({ summary: 'Register a user' })
  @HttpCode(HttpStatus.CREATED)
  public async signUp(
    @Body() dto: CreateUserDto,
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

    this.setAuthCookies(res, tokens);

    return {
      user,
    };
  }

  @Post('sign-in')
  @ApiOperation({ summary: 'Login a user' })
  @HttpCode(HttpStatus.CREATED)
  public async signIn(
    @Body() dto: SignInDto,
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

    const { user, tokens } = await this.authService.signIn({
      ...dto,
      ...clientData,
    });

    this.setAuthCookies(res, tokens);

    return {
      user,
    };
  }

  @Post('sign-out')
  @ApiOperation({ summary: 'Logot current user' })
  @HttpCode(HttpStatus.OK)
  public async signOut(
    @Res() res: Response,
    @CurrentUser('sub') userId: string,
    deviceId: string,
  ) {
    const result = await this.authService.signOut(userId, deviceId);

    this.clearAuthCookies(res);

    return result;
  }

  @Post('sign-out-all-device')
  @ApiOperation({ summary: 'Logot all user devices' })
  @HttpCode(HttpStatus.OK)
  public async signOutAll(
    @Res() res: Response,
    @CurrentUser('sub') userId: string,
  ) {
    const result = await this.authService.signOutAll(userId);

    this.clearAuthCookies(res);

    return result;
  }

  @Post('sign-out-device')
  @ApiOperation({ summary: 'Logot a device' })
  @HttpCode(HttpStatus.OK)
  public async signOutDevice(
    @Res() res: Response,
    @CurrentUser('sub') userId: string,
    deviceId: string,
  ) {
    const result = await this.authService.signOutDevice(userId, deviceId);

    this.clearAuthCookies(res);

    return result;
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('access-token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.clearCookie('refresh-token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
  }

  private setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
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
  }
}
