import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

type TemplatesName = 'password-reset' | 'welcome' | 'verification' | string;

@Injectable()
export class TemplateService {
  private templates: Map<string, any> = new Map();
  private templateCache = new Map<string, string>();
  private readonly appUrl: string;
  private readonly companyName: string;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor() {
    this.companyName = process.env.COMPANYNAME as string | 'Shop';
    this.appUrl = process.env.APP_URL as string | 'http://localhost:9000';
    this.fromEmail = process.env.FROM_EMAIL as string | 'onboarding@resend.dev';
    this.fromName = process.env.EMAIL_FROM_NAME as string | 'Khalifeh-Shop';

    this.loadTemplates();
  }

  public renderTemplate(templateName: TemplatesName, data: any): string {
    const templateContent = this.loadTemplate(templateName);
    const compiled = handlebars.compile(templateContent);

    const defaultData = {
      year: new Date().getFullYear(),
      companyName: this.companyName,
      appUrl: this.appUrl,
      ...data,
    };
    console.log(`Loaded ${templateName} File Successfuly.`);
    return compiled(defaultData);
  }

  private loadTemplates() {
    const isDevelopment = process.env.NODE_ENV !== 'production';

    let templatesDir: string;

    if (isDevelopment) {
      templatesDir = path.join(
        process.cwd(),
        'src',
        'common',
        'services',
        'emails',
        'templates',
      );
    } else {
      templatesDir = path.join(
        process.cwd(),
        'dist',
        'src',
        'common',
        'services',
        'emails',
        'templates',
      );
    }

    try {
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });

        this.createDefaultTemplate(templatesDir);
        return;
      }

      const files = fs.readdirSync(templatesDir);

      if (files.length === 0) {
        this.createDefaultTemplate(templatesDir);
        return;
      }

      for (const file of files) {
        if (file.endsWith('.html')) {
          const templatePath = path.join(templatesDir, file);
          const templateContent = fs.readFileSync(templatePath, 'utf8');
          const templateName = path.basename(file, '.html');

          this.templates.set(templateName, handlebars.compile(templateContent));
        }
      }
    } catch (error: any) {
      throw new Error('Error In Load Email HTML Templates.');
    }
  }

  private loadTemplate(templateName: string) {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    const templatesDir = this.getTemplatesDir();
    const templatePath = path.join(templatesDir, `${templateName}.html`);
    if (!fs.existsSync(templatePath)) {
      throw new InternalServerErrorException(
        `Template ${templateName} not found at ${templatePath}`,
      );
    }
    const content = fs.readFileSync(templatePath, 'utf8');

    this.templateCache.set(templateName, content);
    return content;
  }

  private createDefaultTemplate(templatesDir: string) {
    const defaultTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>{{subject}}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .footer { margin-top: 20px; font-size: 12px; color: #999; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>{{title}}</h1>
            </div>
            <div class="content">
              <p>Hello {{name}},</p>
              <p>{{message}}</p>
            </div>
            <div class="footer">
              <p>&copy; {{year}} Your Company. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
    `;

    const filePath = path.join(templatesDir, 'default.html');
    fs.writeFileSync(filePath, defaultTemplate);
  }

  private getTemplatesDir(): string {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment) {
      return path.join(
        process.cwd(),
        'src',
        'common',
        'services',
        'email',
        'templates',
      );
    }
    return path.join(
      process.cwd(),
      'dist',
      'src',
      'common',
      'services',
      'email',
      'templates',
    );
  }
}
