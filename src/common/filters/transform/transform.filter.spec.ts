import { TransformFilter } from './transform.filter';
import {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';

describe('TransformFilter', () => {
  let filter: TransformFilter<any>;
  let mockResponse: Response;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(() => {
    filter = new TransformFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          url: '/api/v1/users',
          method: 'GET',
          headers: {},
        }),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ArgumentsHost;
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should handle BadRequestException', () => {
    const exception = new BadRequestException('Invalid input data');

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 400,
      success: false,
      message: 'Invalid input data',
      type: 'Bad Request',
      timestamp: expect.any(String),
      path: '/api/v1/users',
    });
  });

  it('should handle validation errors with multiple messages', () => {
    const exception = new BadRequestException({
      message: ['email must be valid', 'password is required'],
    });

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 400,
      success: false,
      message: 'Validation failed',
      type: 'Bad Request',
      timestamp: expect.any(String),
      path: '/api/v1/users',
      errors: {
        email: 'must be valid',
        password: 'is required',
      },
    });
  });

  it('should handle UnauthorizedException', () => {
    const exception = new UnauthorizedException('Invalid token');

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 401,
      success: false,
      message: 'Invalid token',
      type: 'Unauthorized',
      timestamp: expect.any(String),
      path: '/api/v1/users',
    });
  });

  it('should handle ForbiddenException', () => {
    const exception = new ForbiddenException('Access denied');

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 403,
      success: false,
      message: 'Access denied',
      type: 'Forbidden',
      timestamp: expect.any(String),
      path: '/api/v1/users',
    });
  });

  it('should handle NotFoundException', () => {
    const exception = new NotFoundException('User not found');

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 404,
      success: false,
      message: 'User not found',
      type: 'Not Found',
      timestamp: expect.any(String),
      path: '/api/v1/users',
    });
  });

  it('should handle ConflictException', () => {
    const exception = new ConflictException('Email already exists');

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 409,
      success: false,
      message: 'Email already exists',
      type: 'Conflict',
      timestamp: expect.any(String),
      path: '/api/v1/users',
    });
  });

  it('should handle Prisma P2002 error (duplicate)', () => {
    const exception = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '5.0.0',
        meta: { target: ['email'] },
      },
    );

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 409,
      success: false,
      message: 'Duplicate Value Detected',
      type: 'Database Error',
      timestamp: expect.any(String),
      path: '/api/v1/users',
    });
  });

  it('should handle Prisma P2025 error (record not found)', () => {
    const exception = new Prisma.PrismaClientKnownRequestError(
      'Record not found',
      {
        code: 'P2025',
        clientVersion: '5.0.0',
        meta: { cause: 'Record to delete does not exist' },
      },
    );

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 404,
      success: false,
      message: 'Record Not Found',
      type: 'Database Error',
      timestamp: expect.any(String),
      path: '/api/v1/users',
    });
  });

  it('should handle unknown Prisma error code', () => {
    const exception = new Prisma.PrismaClientKnownRequestError(
      'Unknown error',
      {
        code: 'P9999',
        clientVersion: '5.0.0',
      },
    );

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 500,
      success: false,
      message: 'Database Error: P9999',
      type: 'Database Error',
      timestamp: expect.any(String),
      path: '/api/v1/users',
    });
  });

  it('should handle standard JavaScript Error', () => {
    const exception = new Error('Something went wrong');

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 500,
      success: false,
      message: 'Something went wrong',
      type: 'Internal Server Error',
      timestamp: expect.any(String),
      path: '/api/v1/users',
    });
  });

  it('should handle unknown error type', () => {
    const exception = 'This is a string error';

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 500,
      success: false,
      message: 'An Unknown Error Occurred ❌.',
      type: 'Unknown Error',
      timestamp: expect.any(String),
      path: '/api/v1/users',
    });
  });

  it('should handle HttpException with nested response', () => {
    const exception = new HttpException(
      {
        message: 'Custom error message',
        type: 'CustomError',
      },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 400,
      success: false,
      message: 'Custom error message',
      type: 'Bad Request',
      timestamp: expect.any(String),
      path: '/api/v1/users',
    });
  });

  it('should include stack trace in development environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const exception = new Error('Development error');
    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 500,
      success: false,
      message: 'Development error',
      type: 'Internal Server Error',
      timestamp: expect.any(String),
      path: '/api/v1/users',
      stack: expect.any(String),
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('should include Prisma meta in development environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const exception = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '5.0.0',
        meta: { target: ['email'], modelName: 'User' },
      },
    );

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 409,
      success: false,
      message: 'Duplicate Value Detected',
      type: 'Database Error',
      timestamp: expect.any(String),
      path: '/api/v1/users',
      prismaCode: 'P2002',
      meta: { target: ['email'], modelName: 'User' },
      stack: expect.any(String),
    });

    process.env.NODE_ENV = originalEnv;
  });
});
