import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

interface DatabaseError extends Error {
  driverError?: { code?: string };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<{ method: string; url: string }>();
    const response = context.getResponse<{
      status: (statusCode: number) => { json: (body: unknown) => void };
    }>();

    const { statusCode, message } = this.getError(exception);
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Unhandled error (${exception instanceof Error ? exception.name : 'unknown'}) for ${request.method} ${request.url}`,
      );
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private getError(exception: unknown): {
    statusCode: number;
    message: string;
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : typeof body === 'object' && body !== null && 'message' in body
            ? body.message
            : exception.message;
      return {
        statusCode,
        message: Array.isArray(message) ? message.join('; ') : String(message),
      };
    }

    if (exception instanceof QueryFailedError) {
      const code = (exception as DatabaseError).driverError?.code;
      if (code === '23505' || code === '23P01') {
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'The resource conflicts with existing data',
        };
      }
      if (code === '23503') {
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'The related resource does not exist or is in use',
        };
      }
      if (code === '23514' || code === '22P02') {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'The data does not satisfy the required constraints',
        };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }
}
