import { DatabaseService } from './database.service';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    end: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue({ rows: [] }),
    connect: jest.fn().mockResolvedValue({ release: jest.fn() }),
  })),
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn().mockImplementation((callback) => callback({})),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  })),
}));

describe('DatabaseService', () => {
  let service: DatabaseService;
  let mockMasterClient: jest.Mocked<PrismaClient>;
  let mockReplicaClient: jest.Mocked<PrismaClient>;
  let mockMasterPool: jest.Mocked<Pool>;
  let mockReplicaPool: jest.Mocked<Pool>;

  beforeEach(() => {
    process.env.DATABASE_MASTER_URL = 'postgresql://localhost:5432/master';
    process.env.DATABASE_REPLICA_URL = 'postgresql://localhost:5432/replica';

    mockMasterClient = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      $transaction: jest
        .fn()
        .mockImplementation((callback) => callback(mockMasterClient)),
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaClient>;

    mockReplicaClient = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaClient>;

    mockMasterPool = {
      end: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Pool>;

    mockReplicaPool = {
      end: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Pool>;

    service = new DatabaseService();

    (service as any)._master = mockMasterClient;
    (service as any)._replica = mockReplicaClient;
    (service as any).masterPool = mockMasterPool;
    (service as any).replicaPool = mockReplicaPool;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to both master and replica', async () => {
      await service.onModuleInit();

      expect(mockMasterClient.$connect).toHaveBeenCalled();
      expect(mockReplicaClient.$connect).toHaveBeenCalled();
    });

    it('should handle replica connection failure gracefully', async () => {
      mockReplicaClient.$connect.mockRejectedValueOnce(
        new Error('Replica connection failed'),
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.onModuleInit();

      expect(mockMasterClient.$connect).toHaveBeenCalled();
      expect(mockReplicaClient.$connect).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Prisma connection error:',
        expect.any(Error),
      );
      expect((service as any).isReplicaHealthy).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from both databases and close pools', async () => {
      await service.onModuleDestroy();

      expect(mockMasterClient.$disconnect).toHaveBeenCalled();
      expect(mockReplicaClient.$disconnect).toHaveBeenCalled();
      expect(mockMasterPool.end).toHaveBeenCalled();
      expect(mockReplicaPool.end).toHaveBeenCalled();
    });
  });

  describe('master getter', () => {
    it('should return master client', () => {
      expect(service.master).toBe(mockMasterClient);
    });
  });

  describe('replica getter', () => {
    it('should return replica client when healthy', () => {
      (service as any).isReplicaHealthy = true;
      expect(service.replica).toBe(mockReplicaClient);
    });

    it('should fallback to master when replica is unhealthy', () => {
      (service as any).isReplicaHealthy = false;
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      expect(service.replica).toBe(mockMasterClient);
      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️ Replica is down, falling back to Master',
      );

      consoleSpy.mockRestore();
    });
  });

  describe('checkHealth', () => {
    it('should return healthy status for both databases', async () => {
      const result = await service.checkHealth();

      expect(result).toEqual({ master: true, replica: true });
      expect(mockMasterClient.$queryRaw).toHaveBeenCalled();
      expect(mockReplicaClient.$queryRaw).toHaveBeenCalled();
    });

    it('should return unhealthy status for replica when it fails', async () => {
      mockReplicaClient.$queryRaw.mockRejectedValueOnce(
        new Error('Replica down'),
      );

      const result = await service.checkHealth();

      expect(result).toEqual({ master: true, replica: false });
      expect((service as any).isReplicaHealthy).toBe(false);
    });

    it('should return unhealthy status for both when master fails', async () => {
      mockMasterClient.$queryRaw.mockRejectedValueOnce(
        new Error('Master down'),
      );

      const result = await service.checkHealth();

      expect(result).toEqual({ master: false, replica: false });
    });
  });

  describe('transaction', () => {
    it('should execute transaction successfully', async () => {
      const mockResult = { id: 1, name: 'Test' };
      const callback = jest.fn().mockResolvedValue(mockResult);

      const result = await service.transaction(callback);

      expect(result).toBe(mockResult);
      expect(callback).toHaveBeenCalledWith(mockMasterClient);
      expect(mockMasterClient.$transaction).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const callback = jest
        .fn()
        .mockRejectedValue(new Error('Transaction failed'));

      await expect(service.transaction(callback)).rejects.toThrow(
        'Transaction failed',
      );
      expect(callback).toHaveBeenCalledWith(mockMasterClient);
    });
  });

  describe('master write operations', () => {
    it('should create a user using master', async () => {
      const userData = {
        email: 'test@test.com',
        firstName: 'Test Name',
        lastName: 'Test Name',
        password: '12345678',
      };
      const createdUser = { id: 1, ...userData };

      mockMasterClient.user.create = jest.fn().mockResolvedValue(createdUser);

      const result = await service.master.user.create({
        data: userData,
      });

      expect(result).toEqual(createdUser);
      expect(mockMasterClient.user.create).toHaveBeenCalledWith({
        data: userData,
      });
    });

    it('should update a user using master', async () => {
      const updatedUser = {
        id: 1,
        email: 'updated@test.com',
        fullname: 'Updated User',
      };

      mockMasterClient.user.update = jest.fn().mockResolvedValue(updatedUser);

      const result = await service.master.user.update({
        where: { id: '1' },
        data: { email: 'updated@test.com' },
      });

      expect(result).toEqual(updatedUser);
      expect(mockMasterClient.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { email: 'updated@test.com' },
      });
    });
  });

  describe('replica read operations', () => {
    it('should find users using replica', async () => {
      const users = [
        {
          email: 'test@test.com',
          firstName: 'Test Name',
          lastName: 'Test Name',
          password: '12345678',
        },
      ];

      (mockReplicaClient.user.findMany as jest.Mock).mockResolvedValue(users);

      const result = await service.replica.user.findMany();

      expect(result).toEqual(users);
      expect(mockReplicaClient.user.findMany).toHaveBeenCalled();
    });

    it('should find a user by id using replica', async () => {
      const user = {
        id: 1,
        email: 'test@test.com',
        firstName: 'Test Name',
        lastName: 'Test Name',
        password: '12345678',
      };

      (mockReplicaClient.user.findUnique as jest.Mock).mockResolvedValue(user);

      const result = await service.replica.user.findUnique({
        where: { id: '1' },
      });

      expect(result).toEqual(user);
      expect(mockReplicaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });
  });

  describe('Prisma error handling', () => {
    it('should throw Prisma error when master operation fails', async () => {
      const prismaError = new Error('Prisma error');

      (mockMasterClient.user.create as jest.Mock).mockRejectedValue(
        prismaError,
      );

      await expect(
        service.master.user.create({
          data: {
            email: 'test@test.com',
            firstName: 'Test Name',
            lastName: 'Test Name',
            password: '12345678',
          },
        }),
      ).rejects.toThrow('Prisma error');
    });

    it('should throw Prisma error when replica operation fails', async () => {
      const prismaError = new Error('Replica query error');

      (mockReplicaClient.user.findMany as jest.Mock).mockRejectedValue(
        prismaError,
      );

      await expect(service.replica.user.findMany()).rejects.toThrow(
        'Replica query error',
      );
    });
  });
});
