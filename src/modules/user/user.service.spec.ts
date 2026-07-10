import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { DatabaseService } from '../../common/database/database.service';
import { EncryptionService } from '../../common/services/encryption/encryption.service';
import {
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '@prisma/client';

const mockDatabaseService = {
  replica: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
  master: {
    user: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
};

const mockEncryptionService = {
  hashPassword: jest.fn().mockResolvedValue('hashed_password'),
  verifyPassword: jest.fn().mockResolvedValue(true),
};

describe('UserService', () => {
  let service: UserService;
  let prisma: typeof mockDatabaseService;
  let encryption: EncryptionService;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    firstName: 'AmirMohammad',
    lastName: 'Khalifeh',
    password: 'hashed_password',
    userName: 'amir',
    avatar: null,
    bio: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    sellerInfo: null,
    sellerVerified: false,
  };

  const mockSanitizedUser = {
    id: '1',
    email: 'test@example.com',
    firstName: 'AmirMohammad',
    lastName: 'Khalifeh',
    userName: 'amir',
    avatar: null,
    bio: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<DatabaseService>(DatabaseService) as any;
    encryption = module.get<EncryptionService>(EncryptionService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user successfully', async () => {

      const createUserDto: CreateUserDto = {
        firstName: 'AmirMohammad',
        lastName: 'Khalifeh',
        email: 'test@example.com',
        password: '12345678',
        confirmPassword: '12345678',
      };

      mockDatabaseService.replica.user.findUnique.mockResolvedValue(null);
      mockEncryptionService.hashPassword.mockResolvedValue('hashed_password');
      mockDatabaseService.master.user.create.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockSanitizedUser);
      expect(mockDatabaseService.replica.user.findUnique).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(mockEncryptionService.hashPassword).toHaveBeenCalledWith(
        createUserDto.password,
      );
      expect(mockDatabaseService.master.user.create).toHaveBeenCalledWith({
        data: {
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          email: createUserDto.email,
          password: 'hashed_password',
        },
      });
    });

    it('should throw ConflictException if email already exists', async () => {

      const createUserDto: CreateUserDto = {
        firstName: 'AmirMohammad',
        lastName: 'Khalifeh',
        email: 'existing@example.com',
        password: '12345678',
        confirmPassword: '12345678',
      };

      mockDatabaseService.replica.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockDatabaseService.replica.user.findUnique).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(mockDatabaseService.master.user.create).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {

      const createUserDto: CreateUserDto = {
        firstName: 'AmirMohammad',
        lastName: 'Khalifeh',
        email: 'test@example.com',
        password: '12345678',
        confirmPassword: '12345678',
      };

      mockDatabaseService.replica.user.findUnique.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.create(createUserDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated users with default values', async () => {
      const mockUsers = [mockSanitizedUser];
      const mockTotal = 1;

      mockDatabaseService.replica.user.findMany.mockResolvedValue(mockUsers);
      mockDatabaseService.replica.user.count.mockResolvedValue(mockTotal);

      const result = await service.findAll();

      expect(result).toEqual({
        data: mockUsers,
        total: mockTotal,
        limit: 20,
        page: 1,
        pages: 1,
      });
      expect(mockDatabaseService.replica.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          bio: true,
          userName: true,
        },
      });
    });

    it('should return paginated users with custom limit and page', async () => {

      const mockUsers = [mockSanitizedUser];
      const mockTotal = 10;

      mockDatabaseService.replica.user.findMany.mockResolvedValue(mockUsers);
      mockDatabaseService.replica.user.count.mockResolvedValue(mockTotal);

      const result = await service.findAll(5, 2);

      expect(result).toEqual({
        data: mockUsers,
        total: mockTotal,
        limit: 5,
        page: 2,
        pages: 2,
      });
      expect(mockDatabaseService.replica.user.findMany).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          bio: true,
          userName: true,
        },
      });
    });

    it('should handle empty result', async () => {

      mockDatabaseService.replica.user.findMany.mockResolvedValue([]);
      mockDatabaseService.replica.user.count.mockResolvedValue(0);

      const result = await service.findAll();

      expect(result).toEqual({
        data: [],
        total: 0,
        limit: 20,
        page: 1,
        pages: 0,
      });
    });
  });

  describe('findOne', () => {
    it('should return a user by ID', async () => {

      mockDatabaseService.replica.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('1');

      expect(result).toEqual(mockSanitizedUser);
      expect(mockDatabaseService.replica.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException if user not found', async () => {

      mockDatabaseService.replica.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a user successfully', async () => {

      const updateUserDto: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
        bio: 'New bio',
      };

      const updatedUser: Partial<UpdateUserDto> = { ...mockUser, ...updateUserDto };

      mockDatabaseService.replica.user.findUnique.mockResolvedValue(mockUser);
      mockDatabaseService.master.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('1', updateUserDto);

      expect(result).toEqual({
        id: '1',
        email: 'test@example.com',
        firstName: 'Updated',
        lastName: 'Name',
        userName: 'amir',
        avatar: null,
        bio: 'New bio',
      });
      expect(mockDatabaseService.master.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          firstName: 'Updated',
          lastName: 'Name',
          bio: 'New bio',
        },
      });
    });

    it('should throw NotFoundException if user to update does not exist', async () => {

      const updateUserDto: Partial<UpdateUserDto> = { firstName: 'Updated' };

      mockDatabaseService.replica.user.findUnique.mockResolvedValue(null);

      await expect(service.update('999', updateUserDto as UpdateUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove a user successfully', async () => {

      mockDatabaseService.replica.user.findUnique.mockResolvedValue(mockUser);
      mockDatabaseService.master.user.delete.mockResolvedValue(mockUser);

      const result = await service.remove('1');

      expect(result).toEqual(mockSanitizedUser);
      expect(mockDatabaseService.master.user.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException if user to remove does not exist', async () => {

      mockDatabaseService.replica.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneByEmail', () => {
    it('should return a user by email', async () => {

      mockDatabaseService.replica.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOneByEmail('test@example.com');

      expect(result).toEqual(mockSanitizedUser);
      expect(mockDatabaseService.replica.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should throw NotFoundException if user not found by email', async () => {

      mockDatabaseService.replica.user.findUnique.mockResolvedValue(null);

      await expect(service.findOneByEmail('notfound@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('sanitizeUser', () => {
    it('should remove sensitive fields from user object', () => {

      const user = { ...mockUser };

      const result = (service as any).sanitizeUser(user);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('updatedAt');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('firstName');
      expect(result).toHaveProperty('lastName');
      expect(result).toHaveProperty('userName');
    });
  });

  describe('error handling', () => {
    it('should handle InternalServerErrorException in findAll', async () => {

      mockDatabaseService.replica.user.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findAll()).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should handle InternalServerErrorException in findOne', async () => {

      mockDatabaseService.replica.user.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findOne('1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});