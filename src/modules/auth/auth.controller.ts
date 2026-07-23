import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { DeviceInfo } from '../../common/types/device-info.type';
import type { Request, Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeviceUtil } from '../../common/utils/device.util';
import { SignInDto } from './dto/sign-in.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VerifyCodeService } from '../../common/services/verify-code/verify-code.service';
import { ForgetPasswordDto } from './dto/forget-password.dto';
import { resetPasswordDto } from './dto/reset-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { RefreshTokenService } from '../refresh-token/refresh-token.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private verifyCode: VerifyCodeService,
    private refreshTokenService: RefreshTokenService
  ) {}

  @Post('sign-up')
  @ApiOperation({ summary: 'Register a user' })
  @HttpCode(HttpStatus.CREATED)
  public async signUp(
    @Body() dto: CreateUserDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientData: DeviceInfo = DeviceUtil.extractDeviceInfo(req);

    const { user, tokens, deviceInfo } = await this.authService.signUp({
      ...dto,
      ...clientData,
    });

    this.setAuthCookies(res, tokens);

    return {
      user,
      accessToken: tokens.accessToken,
      deviceInfo
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
    const clientData: DeviceInfo = DeviceUtil.extractDeviceInfo(req);

    const { user, tokens, deviceInfo } = await this.authService.signIn({
      ...dto,
      ...clientData,
    });

    this.setAuthCookies(res, tokens);

    return {
      user,
      accessToken: tokens.accessToken,
      deviceInfo
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

  @Post('refresh')
  @ApiOperation({ summary: 'refresh access token' })
  @HttpCode(HttpStatus.OK)
  public async refreshToken(@Req() req: Request, @Res() res: Response) {
    const clientData: DeviceInfo = DeviceUtil.extractDeviceInfo(req);

    const refreshToken = req.cookies['refresh-token'];
    if (!refreshToken)
      throw new UnauthorizedException('Refresh token missing.');

    const { user, ...tokens } = await this.authService.refresh(
      refreshToken,
      clientData,
    );

    this.setAuthCookies(res, tokens);

    return {
      user,
      accessToken: tokens.accessToken,
    };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @HttpCode(HttpStatus.OK)
  public async forgetPassword(@Body() dto: ForgetPasswordDto) {
    return await this.verifyCode.sendVerifyCode(dto.email);
  }

  @Post('verify-reset-code')
  @ApiOperation({ summary: 'Verify reset code' })
  @HttpCode(HttpStatus.OK)
  public async verifyResetCode(
    @Body() dto: VerifyCodeDto,
  ) {
    return this.verifyCode.verifyCode(dto.email, dto.code);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password' })
  @HttpCode(HttpStatus.OK)
  public async resetPassword(
    @Req() req: Request,
    @CurrentUser('sub') userId: string,
    @Body() dto: resetPasswordDto,
  ) {
    const deviceInfo: DeviceInfo = DeviceUtil.extractDeviceInfo(req);
    await this.refreshTokenService.revokeAllTokensByDevice(userId)
    return this.verifyCode.resetPassword({
      ...dto,
      deviceInfo: deviceInfo.userAgent,
    });
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
