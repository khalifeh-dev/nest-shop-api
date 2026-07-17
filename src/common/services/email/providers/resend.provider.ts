import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import type { EmailOptions, EmailProvider } from '../email-options.interface';

@Injectable()
export class ResendProvider implements EmailProvider {
  private resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  public async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const from = options.from || process.env.WEBSITE_HOST_DOMAIN;
      await this.resend.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      console.log("Email Sending Successfuly ✅.")
    } catch (error) {
      throw new Error('Error in send email');
    }
  }
}
