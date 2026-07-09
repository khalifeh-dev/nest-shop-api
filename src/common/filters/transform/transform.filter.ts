import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';


interface ErrorResponse {
  statusCode: number;
  success: false;
  message: string;
  type: string;
  timestamp: string;
  path: string;
  errors?: Record<string, any>;
  stack?: string;
  prismaCode?: string;
  meta?: any;
}

@Catch()
export class TransformFilter<T> implements ExceptionFilter {

  // ------------ Prisma Status ------------
  private readonly prismaStatusMap: Record<string, number> = {
    P2000: 400,
    P2001: 404,
    P2002: 409,
    P2003: 400,
    P2004: 400,
    P2005: 400,
    P2006: 400,
    P2007: 422,
    P2008: 400,
    P2009: 400,
    P2010: 500,
    P2011: 400,
    P2012: 400,
    P2013: 400,
    P2014: 409,
    P2015: 404,
    P2016: 500,
    P2017: 404,
    P2018: 400,
    P2019: 400,
    P2020: 400,
    P2021: 500,
    P2022: 400,
    P2023: 400,
    P2024: 408,
    P2025: 404,
    P2026: 500,
    P2027: 503,
    P2028: 500,
    P2029: 400,
    P2030: 400,
    P2031: 500,
    P2032: 503,
    P2033: 408,
    P2034: 500,
  };

  private readonly prismaMessageMap: Record<string, string> = {
    P2000: 'The Provided Value For The Field Is Too Long',
    P2001: 'The Record With The Provided ID Does Not Exist',
    P2002: 'Duplicate Value Detected',
    P2003: 'Foreign Key Constraint Failed',
    P2004: 'A Database Constraint Was Violated',
    P2005: 'Invalid Value Provided',
    P2006: 'The Provided Value Is Not Valid For This Field',
    P2007: 'Data validation Error',
    P2008: 'Failed To Parse The Query',
    P2009: 'Query Validation Error',
    P2010: 'Failed To Execute Raw Query',
    P2011: 'Null Value Provided For A Required Field',
    P2012: 'Invalid Value Provided For A Field',
    P2013: 'Required Field Is Missing',
    P2014: 'Foreign key Constraint Violation',
    P2015: 'Related Record Not Found',
    P2016: 'Failed To Interpret The Query',
    P2017: 'The Record With The Provided ID Does Not Exist',
    P2018: 'Required Field Is Missing',
    P2019: 'Input Error',
    P2020: 'Value Is Out Of Range',
    P2021: 'Table Does Not Exist',
    P2022: 'Field Does Not Exist',
    P2023: 'Invalid Value Provided',
    P2024: 'Database Connection Timeout',
    P2025: 'Record Not Dound',
    P2026: 'Unsupported Database Provider',
    P2027: 'Database Connection Error',
    P2028: 'Database Transaction Error',
    P2029: 'Value For The Field Is Too Long',
    P2030: 'Failed To Parse The Field',
    P2031: 'Unsupported Database Provider',
    P2032: 'Database Connection Error',
    P2033: 'Transaction Timeout',
    P2034: 'Failed To Write To The Database',
  };

  // ------------ HTTP Status Types ------------
  private readonly errorTypeMap: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };

  public catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const path = request.url;

    const errorResponse = this.parseError(exception, path);
    response.status(errorResponse.statusCode).json(errorResponse);
  }

  // ------------ Error Parser ------------
  private parseError(exception: unknown, path: string): ErrorResponse {
    // ------------ NestJS HTTP Exceptions ------------
    if (exception instanceof HttpException) return this.handleHttpException(exception, path);

    // ------------ Prisma Errors ------------
    if (exception instanceof Prisma.PrismaClientKnownRequestError) return this.handlePrismaError(exception, path);

    // ------------ Standard JS Errors ------------
    if (exception instanceof Error) return this.handleStandardError(exception, path);

    // ------------ Unknown Errors ------------
    return this.handleUnknownError(path);
  }

  private handleHttpException(exception: HttpException, path: string): ErrorResponse {
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;
    
    let message = exceptionResponse?.message || exception.message;
    let errors: Record<string, any> | undefined;

    // ------------ Validation Errors (422) ------------
    if (exception instanceof BadRequestException && Array.isArray(exceptionResponse?.message)) {
      message = 'Validation failed';
      errors = exceptionResponse.message.reduce((acc: Record<string, any>, err: string) => {
        const [field, ...rest] = err.split(' ');
        acc[field] = rest.join(' ') || err;
        return acc;
      }, {});
    }

    // ------------ Specific HTTP Exceptions ------------
    if (exception instanceof NotFoundException) message = exceptionResponse?.message || 'The requested resource was not found';
    if (exception instanceof ConflictException) message = exceptionResponse?.message || 'Duplicate or conflicting data';
    if (exception instanceof ForbiddenException) message = exceptionResponse?.message || 'You do not have permission to access this resource';
    if (exception instanceof UnauthorizedException) message = exceptionResponse?.message || 'Authentication failed';

    const response: ErrorResponse = {
      statusCode,
      success: false,
      message,
      type: this.errorTypeMap[statusCode] || 'HTTP Error',
      timestamp: new Date().toISOString(),
      path,
    };

    if (errors) response.errors = errors;
    if (process.env.NODE_ENV === 'development' && exception.stack) {
      response.stack = exception.stack;
    }

    return response;
  }

  // ------------ Prisma Error Handler ------------
  private handlePrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
    path: string,
  ): ErrorResponse {
    const statusCode = this.prismaStatusMap[exception.code] || 500;
    const message = this.prismaMessageMap[exception.code] || `Database Error: ${exception.code}`;

    const response: ErrorResponse = {
      statusCode,
      success: false,
      message,
      type: 'Database Error',
      timestamp: new Date().toISOString(),
      path,
    };

    if (process.env.NODE_ENV === 'development') {
      response.prismaCode = exception.code;
      response.meta = exception.meta;
      response.stack = exception.stack;
    }

    return response;
  }

  // ------------ Standard Error Handler ------------
  private handleStandardError(exception: Error, path: string): ErrorResponse {
    const response: ErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: exception.message || 'Internal Server Error',
      type: 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path,
    };

    if (process.env.NODE_ENV === 'development') {
      response.stack = exception.stack;
    }

    return response;
  }

  // ------------ Unknown Error Handler ------------
  private handleUnknownError(path: string): ErrorResponse {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: 'An Unknown Error Occurred ❌.',
      type: 'Unknown Error',
      timestamp: new Date().toISOString(),
      path,
    };
  }

}
