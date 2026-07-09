import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EncryptionService],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'mySecretPassword123!';
      const hashed = await service.hashPassword(password);
      
      expect(hashed).toBeDefined();
      expect(hashed).not.toEqual(password);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'mySecretPassword123!';
      const hash1 = await service.hashPassword(password);
      const hash2 = await service.hashPassword(password);
      
      expect(hash1).not.toEqual(hash2); // چون salt متفاوت
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'mySecretPassword123!';
      const hashed = await service.hashPassword(password);
      
      const isValid = await service.verifyPassword(hashed, password);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'mySecretPassword123!';
      const wrongPassword = 'wrongPassword';
      const hashed = await service.hashPassword(password);
      
      const isValid = await service.verifyPassword(hashed, wrongPassword);
      expect(isValid).toBe(false);
    });
  });
});