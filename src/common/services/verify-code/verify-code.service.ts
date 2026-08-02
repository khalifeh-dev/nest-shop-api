import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { EmailService } from '../email/email.service';
import { EncryptionService } from '../encryption/encryption.service';
import { UserService } from '../../../modules/user/user.service';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenService } from '../refresh-token/refresh-token.service';
import { VerifyCodeType } from '../../constants/auth.constant';
import crypto from "crypto"
import type { LoggerService } from '../logger/logger-options.interface';
import { ErrorUtil } from '../../utils/error.util';

@Injectable()
export class VerifyCodeService {
  constructor(
    private prisma: DatabaseService,
    private emailService: EmailService,
    private encryption: EncryptionService,
    private userService: UserService,
    private configService: ConfigService,
    private refreshTokenService: RefreshTokenService,
    @Inject('LoggerService') private logger: LoggerService
  ) {}

  public async sendVerifyCode(email: string, type: VerifyCodeType) {
    this.logger.info(`🔐 Send a verify code`, "VerifyCodeService");
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
        type: VerifyCodeType[type],
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

    this.logger.info(`✅ Verify code sent`, "VerifyCodeService");

    return {
      message: 'Verification code sent to your email.',
      expiresIn,
    };
  }

  public async verifyCode(email: string, code: string) {
    this.logger.info(`🔍 Check & veridy code`, "VerifyCodeService");
    const user = await this.userService.findOneByEmail(email);

    const resetRequest = await this.prisma.replica.verifyCode.findFirst({
      where: {
        userId: user.id,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetRequest){
      this.logger.warn(`🪓 Invalid or expired verification code`, "VerifyCodeService");
      throw new BadRequestException('Invalid or expired verification code');}

    const isValid = await this.encryption.verifyHash(resetRequest.code, code);
    if (!isValid) {
      this.logger.warn(`🪓 Invalid verification code`, "VerifyCodeService");
      throw new BadRequestException('Invalid verification code');}

      this.logger.info(`The code has been verified.`, "VerifyCodeService");

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
    this.logger.info(`🔄️ Reset user password`, "VerifyCodeService");
    const user = await this.userService.findOneByEmail(data.email);

    const resetRequest = await this.prisma.replica.verifyCode.findFirst({
      where: {
        userId: user.id,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetRequest){
      this.logger.warn(`Invalid or expired verification code`, "VerifyCodeService");
      throw new BadRequestException('Invalid or expired verification code');}

    const isValid = await this.encryption.verifyHash(
      resetRequest.code,
      data.code,
    );

    if(!isValid) {
      this.logger.warn(`Invalid verification code`, "VerifyCodeService");
      throw new BadRequestException('Invalid verification code');}

    this.logger.info(`✅ The code has been verified.`, "VerifyCodeService");
    const hashedPassword = await this.encryption.hash(data.newPassword);

    await this.prisma.master.user.update({ where: { id: user.id }, data: { password: hashedPassword } })
    await this.prisma.master.verifyCode.update({
      where: { id: resetRequest.id },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });
    await this.refreshTokenService.revokeAllTokensByDevice(user.id)
    await this.emailService.sendPasswordChangedEmail({
      to: user.email,
      fullname: `${user.firstName} ${user.lastName}`,
      changedAt: new Date().toString(),
      deviceInfo: data.deviceInfo,
      location: data.location,
    });

    this.logger.info(`✅ The password changed successfuly.`, "VerifyCodeService");

    return {
      message:
        'Password reset successfully. Please login with your new password.',
    };
  }

  public async cleanUpExpiredCodes(olderThanDays: number = 7) {
    this.logger.info(`🗡️ Cleaning expired codes`, "VerifyCodeService");
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    try {
      const result = await this.prisma.transaction(async (tx) => {
        const expiredUnused = await tx.verifyCode.deleteMany({
          where: {
            expiresAt: { lt: new Date() },
            isUsed: false,
          },
        });

        const oldUsed = await tx.verifyCode.deleteMany({
          where: {
            usedAt: { lt: cutoffDate },
            isUsed: true,
          },
        });

        return {
          expiredUnusedCount: expiredUnused.count,
          oldUsedCount: oldUsed.count,
          total: expiredUnused.count + oldUsed.count,
        };
      });

      this.logger.info(`✅ Cleaning ${ result.total } successfuly`, "VerifyCodeService");

      return {
        count: result.total,
        details: result,
      };
    } catch (error) {
      const message = ErrorUtil.getMessage(error)
      this.logger.error(`⛔ Error in cleaning old verify codes: ${ message }`, "VerifyCodeService");
      throw new InternalServerErrorException(
        'Internal Server Error (VerifyCode<CleanUpExpiredCodes>) ❌.',
      );
    }
  }

  public generateVerificationCode(): string {
    return crypto.randomUUID()
  }
}
