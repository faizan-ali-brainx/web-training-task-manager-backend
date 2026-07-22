import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Global safety net: formats every thrown error into a consistent JSON shape
 * and logs it server-side. Known NestJS HttpExceptions keep their real status
 * and message; anything else is logged in full but reported to the client as
 * a generic 500 so internal details never leak.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    this.logger.error(exception instanceof Error ? exception.stack : exception);

    if (exception instanceof HttpException) {
      // HttpException.getResponse() is already the full { statusCode, message, error }
      // body NestJS's own exceptions produce — forward it as-is instead of re-wrapping it.
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }
}
