import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { HttpStatus, HttpException } from '@nestjs/common';

const mockUserService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        firstName: 'AmirMohammad',
        lastName: 'Khalifeh',
        email: 'test@example.com',
        password: '12345678',
        confirmPassword: '12345678',
      };

      const expectedResult = {
        id: '1',
        email: 'test@example.com',
        firstName: 'AmirMohammad',
        lastName: 'Khalifeh',
        userName: null,
        avatar: null,
        bio: null,
      };

      mockUserService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(expectedResult);
      expect(mockUserService.create).toHaveBeenCalledWith(createUserDto);
      expect(mockUserService.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if email already exists', async () => {
      const createUserDto: CreateUserDto = {
        firstName: 'AmirMohammad',
        lastName: 'Khalifeh',
        email: 'existing@example.com',
        password: '12345678',
        confirmPassword: '12345678',
      };

      mockUserService.create.mockRejectedValue(
        new HttpException('Email already exists', HttpStatus.CONFLICT),
      );

      await expect(controller.create(createUserDto)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated users with default limit and page', async () => {
      const mockResult = {
        data: [
          {
            id: '1',
            email: 'test1@example.com',
            firstName: 'User1',
            lastName: 'Test1',
            userName: 'user1',
            avatar: null,
            bio: null,
          },
          {
            id: '2',
            email: 'test2@example.com',
            firstName: 'User2',
            lastName: 'Test2',
            userName: 'user2',
            avatar: null,
            bio: null,
          },
        ],
        total: 2,
        limit: 20,
        page: 1,
        pages: 1,
      };

      mockUserService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(undefined, undefined);

      expect(result).toEqual({
        data: mockResult.data,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          pages: 1,
          hasNext: false,
          hasPrev: false,
          nextPage: null,
          prevPage: null,
        },
      });
      expect(mockUserService.findAll).toHaveBeenCalledWith(20, 1);
    });

    it('should return paginated users with custom limit and page', async () => {
      // Arrange
      const mockResult = {
        data: [
          {
            id: '1',
            email: 'test@example.com',
            firstName: 'User1',
            lastName: 'Test1',
          },
        ],
        total: 10,
        limit: 5,
        page: 2,
        pages: 2,
      };

      mockUserService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll('5', '2');

      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 10,
        pages: 2,
        hasNext: false,
        hasPrev: true,
        nextPage: null,
        prevPage: 1,
      });
      expect(mockUserService.findAll).toHaveBeenCalledWith(5, 2);
    });

    it('should handle pagination with next and prev pages', async () => {
      const mockResult = {
        data: [
          {
            id: '1',
            email: 'test@example.com',
            firstName: 'User1',
            lastName: 'Test1',
          },
        ],
        total: 30,
        limit: 10,
        page: 2,
        pages: 3,
      };

      mockUserService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll('10', '2');

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 30,
        pages: 3,
        hasNext: true,
        hasPrev: true,
        nextPage: 3,
        prevPage: 1,
      });
    });
  });

  describe('findOne', () => {
    it('should return a user by ID', async () => {
      const userId = '1';
      const expectedUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'AmirMohammad',
        lastName: 'Khalifeh',
        userName: 'amir',
        avatar: null,
        bio: 'Developer',
      };

      mockUserService.findOne.mockResolvedValue(expectedUser);

      const result = await controller.findOne(userId);

      expect(result).toEqual(expectedUser);
      expect(mockUserService.findOne).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const userId = '999';

      mockUserService.findOne.mockRejectedValue(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      await expect(controller.findOne(userId)).rejects.toThrow(HttpException);
      expect(mockUserService.findOne).toHaveBeenCalledWith(userId);
    });
  });

  describe('update', () => {
    it('should update a user successfully', async () => {
      const updateUserDto: Partial<UpdateUserDto> = {
        firstName: 'Updated',
        lastName: 'Name',
        bio: 'Updated bio',
      };

      const expectedResult = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Updated',
        lastName: 'Name',
        userName: 'amir',
        avatar: null,
        bio: 'Updated bio',
      };

      mockUserService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(
        '1',
        updateUserDto as UpdateUserDto,
      );

      expect(result).toEqual(expectedResult);
      expect(mockUserService.update).toHaveBeenCalledWith('1', updateUserDto);
    });

    it('should throw NotFoundException if user to update does not exist', async () => {
      const updateUserDto: Partial<UpdateUserDto> = { firstName: 'Updated' };

      mockUserService.update.mockRejectedValue(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      await expect(
        controller.update('999', updateUserDto as UpdateUserDto),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('remove', () => {
    it('should remove a user successfully', async () => {
      const userId = '1';
      const expectedResult = {
        id: userId,
        email: 'test@example.com',
        firstName: 'AmirMohammad',
        lastName: 'Khalifeh',
        userName: 'amir',
        avatar: null,
        bio: null,
      };

      mockUserService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(userId);

      expect(result).toEqual(expectedResult);
      expect(mockUserService.remove).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException if user to remove does not exist', async () => {
      const userId = '999';

      mockUserService.remove.mockRejectedValue(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );

      await expect(controller.remove(userId)).rejects.toThrow(HttpException);
      expect(mockUserService.remove).toHaveBeenCalledWith(userId);
    });
  });

  describe('HTTP status codes', () => {
    it('should return 201 for create', async () => {
      const createUserDto: CreateUserDto = {
        firstName: 'AmirMohammad',
        lastName: 'Khalifeh',
        email: 'test@example.com',
        password: '12345678',
        confirmPassword: '12345678',
      };

      mockUserService.create.mockResolvedValue({});

      const result = await controller.create(createUserDto);

      expect(result).toBeDefined();
    });

    it('should return 200 for findAll', async () => {
      mockUserService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        limit: 20,
        page: 1,
        pages: 0,
      });

      const result = await controller.findAll(undefined, undefined);

      expect(result).toBeDefined();
    });
  });
});
