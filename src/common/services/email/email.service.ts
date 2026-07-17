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

  public async sendForgetPassword(data: {
    to: string;
    subject: string;
    name: string;
    year: number;
    companyName: string;
    verifyCode: string[];
    expiredTime: string;
    resendLink: string;
  }) {
    const html = this.templateService.renderTemplate('forget-password', {
      name: data.name,
      year: data.year,
      companyName: data.companyName,
      verifyCode: data.verifyCode,
      expiredTime: data.expiredTime,
      resendLink: data.resendLink,
    });

    await this.sendEmail({
      to: data.to,
      subject: data.subject,
      html,
    });
  }

  public async sendWelcome(data: {
    to: string;
    subject: string;
    name: string;
    year: number;
    companyName: string;
  }) {
    const html = this.templateService.renderTemplate('welcome', {
      name: data.name,
      year: data.year,
      companyName: data.companyName,
    });

    await this.sendEmail({
      to: data.to,
      subject: data.subject,
      html,
    });
  }

  public async sendPasswordChangedEmail(data: {
    to: string;
    fullname: string;
    changedAt: string;
    deviceInfo: string;
    location: string;
  }) {
    const html = this.templateService.renderTemplate('password-changed', {
      fullname: data.fullname,
      email: data.to,
      changedAt: data.changedAt,
      deviceInfo: data.deviceInfo,
      location: data.location,
    });

    await this.sendEmail({
      to: data.to,
      subject: '🔑 Change Password',
      html,
    });
  }
}
