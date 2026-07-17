import { Test, TestingModule } from '@nestjs/testing';
import { VerifyCodeService } from './verify-code.service';

describe('VerifyCodeService', () => {
  let service: VerifyCodeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VerifyCodeService],
    }).compile();

    service = module.get<VerifyCodeService>(VerifyCodeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
