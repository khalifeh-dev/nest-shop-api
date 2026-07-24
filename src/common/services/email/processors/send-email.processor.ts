import { Processor, Process } from '@nestjs/bull';
import { type Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { EmailProvider } from '../email-options.interface';
import { EmailFactory } from '../email.factory';

@Processor('email-queue')
@Injectable()
export class SendEmailProcessor {
  private emailProvider: EmailProvider;

  constructor() {
    this.emailProvider = EmailFactory.create();
  }

  @Process('send-welcome-email')
  async sendWelcomeEmail(job: Job) {
    const { to, subject, html, from, metadata } = job.data;

    try {
      await this.emailProvider.sendEmail({
        to,
        subject,
        html,
        from,
      });

      return { success: true, to, metadata };
    } catch (error) {
      throw error;
    }
  } 
}
