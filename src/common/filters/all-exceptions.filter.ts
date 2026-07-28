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
 * Global safety net: formats every thrown error into the same
 * `{ success: false, message }` envelope ResponseInterceptor uses for
 * successes, and logs it server-side. Known NestJS HttpExceptions keep their
 * real status; anything else is logged in full but reported to the client as
 * a generic 500 so internal details never leak.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    this.logger.error(exception instanceof Error ? exception.stack : exception);

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json({
        success: false,
        message: this.extractMessage(exception.getResponse()),
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
    });
  }

  /**
   * NestJS's built-in HttpExceptions carry their message as either a plain
   * string or a `{ message }` body (an array of strings for class-validator
   * failures) — this collapses either shape into one string.
   * @param body - the exception's response body
   * @returns a single human-readable message
   */
  private extractMessage(body: string | object): string {
    if (typeof body === 'string') return body;
    const message = (body as { message?: string | string[] }).message;
    if (Array.isArray(message)) return message.join(', ');
    return message ?? 'An error occurred';
  }
}
