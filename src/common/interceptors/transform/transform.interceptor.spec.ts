import { Test, TestingModule } from '@nestjs/testing';
import { TransformInterceptor, Response } from './transform.interceptor';
import { CallHandler, ExecutionContext, HttpStatus } from '@nestjs/common';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new TransformInterceptor();

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          url: '/api/v1/users',
          method: 'GET',
          query: { page: 1, limit: 10 },
          headers: {
            'user-agent': 'jest-test',
            'x-device-id': 'test-device-123',
          },
        }),
        getResponse: jest.fn().mockReturnValue({
          statusCode: HttpStatus.OK,
        }),
      }),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ id: 1, name: 'Test User' })),
    } as unknown as CallHandler;
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should transform response with success structure', (done) => {
    const result$ = interceptor.intercept(
      mockExecutionContext,
      mockCallHandler,
    );

    result$.subscribe({
      next: (response: Response) => {
        expect(response).toBeDefined();
        expect(response.success).toBe(true);
        expect(response.statusCode).toBe(HttpStatus.OK);
        expect(response.message).toBe('Operation Successful ✅');
        expect(response.data).toEqual({ id: 1, name: 'Test User' });
        expect(response.timestamp).toBeDefined();
        expect(response.path).toBe('/api/v1/users');
        done();
      },
    });
  });

  it('should include pagination if data has pagination', (done) => {
    const paginatedData = {
      data: [{ id: 1, name: 'User 1' }],
      pagination: {
        total: 10,
        page: 1,
        limit: 5,
        totalPages: 2,
      },
    };

    mockCallHandler.handle = jest.fn().mockReturnValue(of(paginatedData));

    const result$ = interceptor.intercept(
      mockExecutionContext,
      mockCallHandler,
    );

    result$.subscribe({
      next: (response: Response) => {
        expect(response.pagination).toBeDefined();
        expect(response.pagination?.total).toBe(10);
        expect(response.pagination?.page).toBe(1);
        expect(response.pagination?.limit).toBe(5);
        expect(response.pagination?.totalPages).toBe(2);
        expect(response.data).toEqual(paginatedData.data);
        done();
      },
    });
  });

  it('should include debug info in development environment', (done) => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const result$ = interceptor.intercept(
      mockExecutionContext,
      mockCallHandler,
    );

    result$.subscribe({
      next: (response: Response) => {
        expect(response._debug).toBeDefined();
        expect(response._debug?.path).toBe('/api/v1/users');
        expect(response._debug?.method).toBe('GET');
        expect(response._debug?.query).toEqual({ page: 1, limit: 10 });
        expect(response._debug?.headers).toBeDefined();
        expect(response._debug?.headers['user-agent']).toBe('jest-test');
        expect(response._debug?.headers['x-device-id']).toBe('test-device-123');

        process.env.NODE_ENV = originalEnv;
        done();
      },
    });
  });

  it('should NOT include debug info in production environment', (done) => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const result$ = interceptor.intercept(
      mockExecutionContext,
      mockCallHandler,
    );

    result$.subscribe({
      next: (response: Response) => {
        expect(response._debug).toBeUndefined();

        process.env.NODE_ENV = originalEnv;
        done();
      },
    });
  });

  it('should use custom message if provided', (done) => {
    const customData = {
      message: 'Custom success message',
      data: { id: 1 },
    };

    mockCallHandler.handle = jest.fn().mockReturnValue(of(customData));

    const result$ = interceptor.intercept(
      mockExecutionContext,
      mockCallHandler,
    );

    result$.subscribe({
      next: (response: Response) => {
        expect(response.message).toBe('Custom success message');
        done();
      },
    });
  });

  it('should set success: false for non-2xx status codes', (done) => {
    mockExecutionContext.switchToHttp = jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        url: '/api/v1/users',
        method: 'GET',
        query: {},
        headers: {},
      }),
      getResponse: jest.fn().mockReturnValue({
        statusCode: HttpStatus.NOT_FOUND,
      }),
    });

    const result$ = interceptor.intercept(
      mockExecutionContext,
      mockCallHandler,
    );

    result$.subscribe({
      next: (response: Response) => {
        expect(response.success).toBe(false);
        expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
        done();
      },
    });
  });

  it('should handle null data gracefully', (done) => {
    mockCallHandler.handle = jest.fn().mockReturnValue(of(null));

    const result$ = interceptor.intercept(
      mockExecutionContext,
      mockCallHandler,
    );

    result$.subscribe({
      next: (response: Response) => {
        expect(response.data).toBe(null);
        expect(response.message).toBe('Operation Successful ✅');
        done();
      },
    });
  });

  it('should handle nested data structure', (done) => {
    const nestedData = {
      data: {
        user: { id: 1, name: 'Test' },
        posts: [{ id: 1, title: 'Post 1' }],
      },
    };

    mockCallHandler.handle = jest.fn().mockReturnValue(of(nestedData));

    const result$ = interceptor.intercept(
      mockExecutionContext,
      mockCallHandler,
    );

    result$.subscribe({
      next: (response: Response) => {
        expect(response.data).toEqual(nestedData.data);
        done();
      },
    });
  });

  it('should generate a valid ISO timestamp', (done) => {
    const result$ = interceptor.intercept(
      mockExecutionContext,
      mockCallHandler,
    );

    result$.subscribe({
      next: (response: Response) => {
        const timestamp = response.timestamp;
        const date = new Date(timestamp);

        expect(date.toISOString()).toBe(timestamp);
        expect(date.getTime()).toBeLessThanOrEqual(Date.now());
        done();
      },
    });
  });
});
