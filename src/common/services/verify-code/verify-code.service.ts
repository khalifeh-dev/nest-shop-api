import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { EmailService } from '../email/email.service';
import { EncryptionService } from '../encryption/encryption.service';
import { UserService } from '../../../modules/user/user.service';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenService } from '../../../modules/refresh-token/refresh-token.service';
import { VerifyCodeType } from '../../constants/auth.constant';

@Injectable()
export class VerifyCodeService {
  constructor(
    private prisma: DatabaseService,
    private emailService: EmailService,
    private encryption: EncryptionService,
    private userService: UserService,
    private configService: ConfigService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  public async sendVerifyCode(email: string, type: VerifyCodeType) {
    const user = await this.userService.findOneByEmail(email);

    await this.prisma.master.verifyCode.updateMany({
      where: {
        userId: user.id,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    const code = this.generateVerificationCode();
    const hashedCode = await this.encryption.hash(code);

    const expiresIn =
      this.configService.get<number>('PASSWORD_RESET_EXPIRES_IN') || 15;
    const expiresAt = new Date(Date.now() + expiresIn * 60_000);

    await this.prisma.master.verifyCode.create({
      data: {
        userId: user.id,
        email,
        code: hashedCode,
        expiresAt,
        type: VerifyCodeType[type]
      },
    });

    await this.emailService.sendForgetPassword({
      to: user.email,
      subject: '🔐 Verify Email',
      name: user.firstName,
      year: 2026,
      companyName: 'khalifeh-shop',
      verifyCode: code.split(''),
      expiredTime: String(expiresIn),
      resendLink: `${this.configService.get<string>('APP_URL')}/api/v1/auth/resend-verify-code`,
    });

    return {
      message: 'Verification code sent to your email.',
      expiresIn,
    };
  }

  public async verifyCode(email: string, code: string) {
    const user = await this.userService.findOneByEmail(email);

    const resetRequest = await this.prisma.replica.verifyCode.findFirst({
      where: {
        userId: user.id,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetRequest)
      throw new BadRequestException('Invalid or expired verification code');

    const isValid = await this.encryption.verifyHash(resetRequest.code, code);
    if (!isValid) throw new BadRequestException('Invalid verification code');

    return { valid: true };
  }

  public async resetPassword(data: {
    email: string;
    code: string;
    newPassword: string;
    confirmPassword: string;
    deviceInfo: string;
    location: string;
  }) {
    const user = await this.userService.findOneByEmail(data.email);

    const resetRequest = await this.prisma.replica.verifyCode.findFirst({
      where: {
        userId: user.id,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetRequest)
      throw new BadRequestException('Invalid or expired verification code');

    const isValid = await this.encryption.verifyHash(
      resetRequest.code,
      data.code,
    );
    if (!isValid) throw new BadRequestException('Invalid verification code');

    const hashedPassword = await this.encryption.hash(data.newPassword);

    await this.userService.update(user.id, { password: hashedPassword });
    await this.prisma.master.verifyCode.update({
      where: { id: resetRequest.id },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });
    await this.refreshTokenService.revokeAllTokensByDevice(user.id);

    await this.emailService.sendPasswordChangedEmail({
      to: user.email,
      fullname: `${user.firstName} ${user.lastName}`,
      changedAt: new Date().toString(),
      deviceInfo: data.deviceInfo,
      location: data.location,
    });

    return {
      message:
        'Password reset successfully. Please login with your new password.',
    };
  }

  //! Set Cron Job For This
  public async cleanupExpiredCodes() {
    const result = await this.prisma.master.verifyCode.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        isUsed: false,
      },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    return {
      message: `Cleaned up ${result.count} expired codes`,
      count: result.count,
    };
  }

  public generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
