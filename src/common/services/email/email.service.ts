import { Injectable } from '@nestjs/common';
import type { EmailOptions, EmailProvider } from './email-options.interface';
import { EmailFactory } from './email.factory';
import { TemplateService } from './template.service';
import { InjectQueue } from '@nestjs/bull';
import { type Queue } from 'bull';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private provider: EmailProvider;
  private templateService: TemplateService;

  constructor(
    @InjectQueue('email-queue')
    private emailQueue: Queue,
    private configService: ConfigService,
  ) {
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
   try {
      const companyName = this.configService.get('COMPANY_NAME', 'Khalifeh Shop');
      const year = new Date().getFullYear();
      const subject = data.subject || '💖 Welcome to Our Platform';

      const html = this.templateService.renderTemplate('welcome', {
        name: data.name,
        year,
        companyName,
      });
      
      const job = await this.emailQueue.add(
        'send-welcome-email',
        {
          to: data.to,
          subject,
          html,
          from: this.configService.get('FROM_EMAIL'),
          metadata: {
            name: data.name,
            year,
            companyName,
          },
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          delay: 1000,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      return {
        queued: true,
        jobId: job.id,
        message: 'Email Queued Successfully',
      };
    } catch (error) {
      throw error;
    }
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
