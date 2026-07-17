import { Injectable } from '@nestjs/common';
import type { EmailOptions, EmailProvider } from './email-options.interface';
import { EmailFactory } from './email.factory';
import { TemplateService } from './template.service';

@Injectable()
export class EmailService {
  private provider: EmailProvider;
  private templateService: TemplateService;

  constructor() {
    this.provider = EmailFactory.create();
    this.templateService = new TemplateService();
  }

  public async sendEmail(options: EmailOptions): Promise<void> {
    return this.provider.sendEmail(options);
  }

  public async sendForgetPassword(
    to: string,
    subject: string = '🔐 Password Recovery',
    name: string,
    resetLink: string,
    year: number,
    companyName: string,
    verifyCode: string[],
    expiredTime: string,
    resendLink: string
  ) {
    const html = this.templateService.renderTemplate('forget-password', {
      name,
      resetLink,
      year,
      companyName,
      verifyCode,
      expiredTime,
      resendLink
    });

    await this.sendEmail({
      to,
      subject,
      html,
    });
  }

  public async sendWelcome(
    to: string,
    subject: string = '💖 Welcome To Your Website',
    name: string,
    year: number,
    companyName: string,
  ) {
    const html = this.templateService.renderTemplate('welcome', {
      name,
      year,
      companyName,
    });

    await this.sendEmail({
      to,
      subject,
      html,
    });
  }
}
