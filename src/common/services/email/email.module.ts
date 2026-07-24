import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { TemplateService } from './template.service';
import { ResendProvider } from './providers/resend.provider';
import { NodemailerProvider } from './providers/nodemailer.provider';
import { BullModule } from '@nestjs/bull';
import { SendEmailProcessor } from './processors/send-email.processor';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email-queue',
    }),
  ],
  providers: [
    EmailService,
    TemplateService,
    SendEmailProcessor,
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
