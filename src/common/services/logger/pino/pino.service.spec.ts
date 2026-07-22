import { Test, TestingModule } from '@nestjs/testing';
import { PinoService } from './pino.service';

describe('PinoService', () => {
  let service: PinoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PinoService],
    }).compile();

    service = module.get<PinoService>(PinoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
