import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

export interface Response<T = any> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  path: string;
  statusCode: number;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  _debug?: Record<string, any>;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode || HttpStatus.OK;
    const path = request.url;

    const isDevelopment = process.env.NODE_ENV === 'development';

    return next.handle().pipe(
      map((data) => {
        const responseData: Response<T> = {
          success: statusCode >= 200 && statusCode < 300,
          message: data?.message || 'Operation Successful ✅',
          data: data?.data !== undefined ? data.data : data,
          timestamp: new Date().toISOString(),
          path: path,
          statusCode: statusCode,
        };

        if (data?.pagination) {
          responseData.pagination = data.pagination;
        }

        if (isDevelopment) {
          responseData._debug = {
            timestamp: new Date().toISOString(),
            path: path,
            method: request.method,
            query: request.query,
            headers: {
              'user-agent': request.headers['user-agent'],
              'x-device-id': request.headers['x-device-id'],
            },
          };
        }

        return responseData;
      }),
    );
  }
}
