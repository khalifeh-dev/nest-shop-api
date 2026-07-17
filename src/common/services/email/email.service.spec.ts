// src/common/services/email/__tests__/email.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { TemplateService } from './template.service';
import { EmailFactory } from './email.factory';
import { EmailProvider } from './email-options.interface';

// ✅ Mock کردن EmailFactory
jest.mock('./email.factory');
jest.mock('./template.service');

describe('EmailService', () => {
  let emailService: EmailService;
  let mockTemplateService: jest.Mocked<TemplateService>;
  let mockProvider: jest.Mocked<EmailProvider>;

  beforeEach(async () => {
    // ✅ Clear mocks
    jest.clearAllMocks();

    // ✅ Mock TemplateService
    mockTemplateService = {
      renderTemplate: jest.fn(),
    } as any;

    // ✅ Mock EmailProvider
    mockProvider = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    } as any;

    // ✅ Mock EmailFactory.create()
    (EmailFactory.create as jest.Mock).mockReturnValue(mockProvider);

    // ✅ Mock constructor TemplateService
    (TemplateService as jest.Mock).mockImplementation(() => mockTemplateService);

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(emailService).toBeDefined();
    });

    it('should create provider using EmailFactory', () => {
      expect(EmailFactory.create).toHaveBeenCalled();
      expect(emailService['provider']).toBe(mockProvider);
    });

    it('should create template service', () => {
      expect(TemplateService).toHaveBeenCalled();
      expect(emailService['templateService']).toBe(mockTemplateService);
    });
  });

  describe('sendEmail', () => {
    it('should send email with provider', async () => {
      // ✅ Arrange
      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      };

      // ✅ Act
      await emailService.sendEmail(options);

      // ✅ Assert
      expect(mockProvider.sendEmail).toHaveBeenCalledWith(options);
      expect(mockProvider.sendEmail).toHaveBeenCalledTimes(1);
    });

    it('should handle provider errors', async () => {
      // ✅ Arrange
      const options = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      };
      const error = new Error('Provider error');
      mockProvider.sendEmail.mockRejectedValue(error);

      // ✅ Act & Assert
      await expect(emailService.sendEmail(options)).rejects.toThrow('Provider error');
      expect(mockProvider.sendEmail).toHaveBeenCalledWith(options);
    });
  });

  describe('sendForgetPassword', () => {
    it('should send forget password email', async () => {
      // ✅ Arrange
      const to = 'user@example.com';
      const subject = '🔐 Password Recovery';
      const name = 'John Doe';
      const resetLink = 'https://example.com/reset?token=123';
      const year = 2024;
      const companyName = 'MyShop';
      const verifyCode = ['123456'];
      const expiredTime = '24 hours';
      const resendLink = 'https://example.com/resend';

      const renderedHtml = '<p>Reset your password</p>';
      mockTemplateService.renderTemplate.mockReturnValue(renderedHtml);

      // ✅ Act
      await emailService.sendForgetPassword(
        to,
        subject,
        name,
        resetLink,
        year,
        companyName,
        verifyCode,
        expiredTime,
        resendLink,
      );

      // ✅ Assert
      expect(mockTemplateService.renderTemplate).toHaveBeenCalledWith(
        'forget-password',
        {
          name,
          resetLink,
          year,
          companyName,
          verifyCode,
          expiredTime,
          resendLink,
        },
      );
      expect(mockProvider.sendEmail).toHaveBeenCalledWith({
        to,
        subject,
        html: renderedHtml,
      });
    });

    it('should send forget password email with default subject', async () => {
      // ✅ Arrange
      const to = 'user@example.com';
      const name = 'John Doe';
      const resetLink = 'https://example.com/reset?token=123';
      const year = 2024;
      const companyName = 'MyShop';
      const verifyCode = ['123456'];
      const expiredTime = '24 hours';
      const resendLink = 'https://example.com/resend';

      const renderedHtml = '<p>Reset your password</p>';
      mockTemplateService.renderTemplate.mockReturnValue(renderedHtml);

      // ✅ Act
      await emailService.sendForgetPassword(
        to,
        undefined as any,
        name,
        resetLink,
        year,
        companyName,
        verifyCode,
        expiredTime,
        resendLink,
      );

      // ✅ Assert
      expect(mockProvider.sendEmail).toHaveBeenCalledWith({
        to,
        subject: '🔐 Password Recovery',
        html: renderedHtml,
      });
    });

    it('should handle template rendering errors', async () => {
      // ✅ Arrange
      const to = 'user@example.com';
      const name = 'John Doe';
      const resetLink = 'https://example.com/reset?token=123';
      const year = 2024;
      const companyName = 'MyShop';
      const verifyCode = ['123456'];
      const expiredTime = '24 hours';
      const resendLink = 'https://example.com/resend';

      const error = new Error('Template error');
      mockTemplateService.renderTemplate.mockImplementation(() => {
        throw error;
      });

      // ✅ Act & Assert
      await expect(
        emailService.sendForgetPassword(
          to,
          'Subject',
          name,
          resetLink,
          year,
          companyName,
          verifyCode,
          expiredTime,
          resendLink,
        ),
      ).rejects.toThrow('Template error');
    });
  });

  describe('sendWelcome', () => {
    it('should send welcome email', async () => {
      // ✅ Arrange
      const to = 'user@example.com';
      const subject = '💖 Welcome To Your Website';
      const name = 'John Doe';
      const year = 2024;
      const companyName = 'MyShop';

      const renderedHtml = '<p>Welcome!</p>';
      mockTemplateService.renderTemplate.mockReturnValue(renderedHtml);

      // ✅ Act
      await emailService.sendWelcome(to, subject, name, year, companyName);

      // ✅ Assert
      expect(mockTemplateService.renderTemplate).toHaveBeenCalledWith(
        'welcome',
        {
          name,
          year,
          companyName,
        },
      );
      expect(mockProvider.sendEmail).toHaveBeenCalledWith({
        to,
        subject,
        html: renderedHtml,
      });
    });

    it('should send welcome email with default subject', async () => {
      // ✅ Arrange
      const to = 'user@example.com';
      const name = 'John Doe';
      const year = 2024;
      const companyName = 'MyShop';

      const renderedHtml = '<p>Welcome!</p>';
      mockTemplateService.renderTemplate.mockReturnValue(renderedHtml);

      // ✅ Act
      await emailService.sendWelcome(to, undefined as any, name, year, companyName);

      // ✅ Assert
      expect(mockProvider.sendEmail).toHaveBeenCalledWith({
        to,
        subject: '💖 Welcome To Your Website',
        html: renderedHtml,
      });
    });

    it('should handle template rendering errors', async () => {
      // ✅ Arrange
      const to = 'user@example.com';
      const name = 'John Doe';
      const year = 2024;
      const companyName = 'MyShop';

      const error = new Error('Template error');
      mockTemplateService.renderTemplate.mockImplementation(() => {
        throw error;
      });

      // ✅ Act & Assert
      await expect(
        emailService.sendWelcome(to, 'Subject', name, year, companyName),
      ).rejects.toThrow('Template error');
    });
  });

  describe('integration with real provider', () => {
    it('should handle provider errors in sendForgetPassword', async () => {
      // ✅ Arrange
      const to = 'user@example.com';
      const name = 'John Doe';
      const resetLink = 'https://example.com/reset?token=123';
      const year = 2024;
      const companyName = 'MyShop';
      const verifyCode = ['123456'];
      const expiredTime = '24 hours';
      const resendLink = 'https://example.com/resend';

      mockTemplateService.renderTemplate.mockReturnValue('<p>Reset</p>');
      const error = new Error('Provider error');
      mockProvider.sendEmail.mockRejectedValue(error);

      // ✅ Act & Assert
      await expect(
        emailService.sendForgetPassword(
          to,
          'Subject',
          name,
          resetLink,
          year,
          companyName,
          verifyCode,
          expiredTime,
          resendLink,
        ),
      ).rejects.toThrow('Provider error');
    });

    it('should handle provider errors in sendWelcome', async () => {
      // ✅ Arrange
      const to = 'user@example.com';
      const name = 'John Doe';
      const year = 2024;
      const companyName = 'MyShop';

      mockTemplateService.renderTemplate.mockReturnValue('<p>Welcome</p>');
      const error = new Error('Provider error');
      mockProvider.sendEmail.mockRejectedValue(error);

      // ✅ Act & Assert
      await expect(
        emailService.sendWelcome(to, 'Subject', name, year, companyName),
      ).rejects.toThrow('Provider error');
    });
  });

  describe('edge cases', () => {
    it('should handle empty name', async () => {
      // ✅ Arrange
      const to = 'user@example.com';
      const name = '';
      const resetLink = 'https://example.com/reset?token=123';
      const year = 2024;
      const companyName = 'MyShop';
      const verifyCode = ['123456'];
      const expiredTime = '24 hours';
      const resendLink = 'https://example.com/resend';

      mockTemplateService.renderTemplate.mockReturnValue('<p>Reset</p>');

      // ✅ Act
      await emailService.sendForgetPassword(
        to,
        'Subject',
        name,
        resetLink,
        year,
        companyName,
        verifyCode,
        expiredTime,
        resendLink,
      );

      // ✅ Assert
      expect(mockTemplateService.renderTemplate).toHaveBeenCalledWith(
        'forget-password',
        expect.objectContaining({
          name: '',
        }),
      );
    });

    it('should handle special characters in name', async () => {
      // ✅ Arrange
      const to = 'user@example.com';
      const name = '<script>alert("XSS")</script>';
      const resetLink = 'https://example.com/reset?token=123';
      const year = 2024;
      const companyName = 'MyShop';
      const verifyCode = ['123456'];
      const expiredTime = '24 hours';
      const resendLink = 'https://example.com/resend';

      mockTemplateService.renderTemplate.mockReturnValue('<p>Reset</p>');

      // ✅ Act
      await emailService.sendForgetPassword(
        to,
        'Subject',
        name,
        resetLink,
        year,
        companyName,
        verifyCode,
        expiredTime,
        resendLink,
      );

      // ✅ Assert
      expect(mockTemplateService.renderTemplate).toHaveBeenCalledWith(
        'forget-password',
        expect.objectContaining({
          name,
        }),
      );
    });
  });
});