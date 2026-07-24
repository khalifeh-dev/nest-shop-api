import {
  BadRequestException,
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
import { UserService } from '../user/user.service';
import { DatabaseService } from '../../common/database/database.service';
import { Throttle } from '@nestjs/throttler';
import { VerifyCodeType } from '../../common/constants/auth.constant';
import { EmailService } from '../../common/services/email/email.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly RESEND_COOLDOWN;
  private readonly CODE_EXPIRY;
  private readonly MAX_ATTEMPTS_PER_DAY;

  constructor(
    private prisma: DatabaseService,
    private authService: AuthService,
    private userService: UserService,
    private verifyCode: VerifyCodeService,
    private refreshTokenService: RefreshTokenService,
    private emailService: EmailService,
  ) {
    this.RESEND_COOLDOWN = process.env.RESEND_COOLDOWN;
    this.CODE_EXPIRY = process.env.CODE_EXPIRY;
    this.MAX_ATTEMPTS_PER_DAY = process.env.MAX_ATTEMPTS_PER_DAY;
  }

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

    this.emailService.sendWelcome({
      to: dto.email,
      subject: '💖 Welcome to Our Platform',
      name: dto.firstName,
      companyName: 'khalifeh shop',
      year: 2026,
    });

    return {
      user,
      accessToken: tokens.accessToken,
      deviceInfo,
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
      deviceInfo,
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
    await this.userService.findOneByEmail(dto.email);
    return await this.verifyCode.sendVerifyCode(
      dto.email,
      VerifyCodeType.PASSWORD_RESET,
    );
  }

  @Post('verify-reset-code')
  @ApiOperation({ summary: 'Verify reset code' })
  @HttpCode(HttpStatus.OK)
  public async verifyResetCode(@Body() dto: VerifyCodeDto) {
    return await this.verifyCode.verifyCode(dto.email, dto.code);
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
    await this.refreshTokenService.revokeAllTokensByDevice(userId);
    return this.verifyCode.resetPassword({
      ...dto,
      deviceInfo: deviceInfo.userAgent,
    });
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  public async resendVerifyResetCode(@Body() dto: ForgetPasswordDto) {
    await this.userService.findOneByEmail(dto.email);
    await this.checkResendCooldown(dto.email);
    await this.checkDailyLimit(dto.email);

    await this.prisma.master.verifyCode.updateMany({
      where: {
        email: dto.email,
        type: 'EMAIL_VERIFICATION',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        expiresAt: new Date(),
      },
    });

    return await this.verifyCode.sendVerifyCode(
      dto.email,
      VerifyCodeType.EMAIL_VERIFICATION,
    );
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
      maxAge: 900_000,
    });

    res.cookie('refresh-token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1_209_600,
    });
  }

  private async checkResendCooldown(email: string) {
    const lastRequest = await this.getLastRequestTime(email);

    if (lastRequest) {
      const timeSinceLastRequest = (Date.now() - lastRequest) / 1000;
      if (timeSinceLastRequest < this.RESEND_COOLDOWN) {
        const remainingTime = Math.ceil(
          this.RESEND_COOLDOWN - timeSinceLastRequest,
        );
        throw new BadRequestException(`Please Wait To ${remainingTime}`);
      }
    }
  }

  private async checkDailyLimit(email: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await this.prisma.replica.verifyCode.count({
      where: {
        email,
        type: 'EMAIL_VERIFICATION',
        createdAt: { gte: today },
      },
    });

    if (count >= this.MAX_ATTEMPTS_PER_DAY) {
      throw new BadRequestException(
        `You have exceeded the allowed number of code requests. Please try again later.`,
      );
    }
  }

  private async saveLastRequest(email: string) {
    this.requestCache.set(email, Date.now());
  }

  private async getLastRequestTime(email: string): Promise<number | null> {
    return this.requestCache.get(email) || null;
  }

  private requestCache = new Map<string, number>();
}
