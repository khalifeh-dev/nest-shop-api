import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { EmailOptions, EmailProvider } from '../email-options.interface';

@Injectable()
export class NodemailerProvider implements EmailProvider {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  public async sendEmail(options: EmailOptions): Promise<void> {
  try {
    const from = options.from || process.env.GMAIL_USER;
    await this.transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    throw new InternalServerErrorException('Failed to send email');
  }
  }
}
