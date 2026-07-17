import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { TemplateService } from './template.service';
import { ResendProvider } from './providers/resend.provider';
import { NodemailerProvider } from './providers/nodemailer.provider';

@Global()
@Module({
  providers: [
    EmailService,
    TemplateService,
    {
      provide: 'EmailProvider',
      useFactory: () => {
        const provider = process.env.EMAIL_PROVIDER || 'resend';
        if (provider === 'resend') {
          return new ResendProvider();
        }
        return new NodemailerProvider();
      },
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
