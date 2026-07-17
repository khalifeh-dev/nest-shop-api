import { EmailProvider } from './email-options.interface';
import { ResendProvider } from './providers/resend.provider';
import { NodemailerProvider } from './providers/nodemailer.provider';

export class EmailFactory {
  static create(): EmailProvider {
    const provider = process.env.EMAIL_PROVIDER || 'nodemailer' || 'resend';

    switch (provider) {
      case 'resend':
        return new ResendProvider();
      case 'nodemailer':
        return new NodemailerProvider();
      default:
        return new ResendProvider();
    }
  }
}
