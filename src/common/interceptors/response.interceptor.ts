import {
  type CallHandler,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message: string;
}

// Declared as a plain number (not the enum type) so the comparison below
// doesn't trip @typescript-eslint/no-unsafe-enum-comparison.
const NO_CONTENT_STATUS: number = HttpStatus.NO_CONTENT;

/**
 * Wraps every successful response in a consistent envelope
 * (`{ success, data, message }`) so callers never need per-endpoint
 * response-shape branching. Error responses are shaped the same way by
 * AllExceptionsFilter. A handler returning `{ message, ...rest }` has
 * `message` hoisted to the envelope's own `message` field; a 204 No Content
 * response is left untouched, since that status must carry no body.
 * @param context - the current execution context
 * @param next - the next handler in the interceptor chain
 * @returns the wrapped response, or the raw value for 204 responses
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T> | T
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T> | T> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((result) => {
        if (response.statusCode === NO_CONTENT_STATUS) return result;
        const wrapped: ApiSuccessResponse<T> = {
          success: true,
          data: this.extractData(result) as T,
          message: this.extractMessage(result),
        };
        return wrapped;
      }),
    );
  }

  private hasMessage(result: unknown): result is { message: string } {
    return (
      typeof result === 'object' &&
      result !== null &&
      'message' in result &&
      typeof result.message === 'string'
    );
  }

  private extractMessage(result: unknown): string {
    return this.hasMessage(result) ? result.message : 'Success';
  }

  private extractData(result: unknown): unknown {
    if (!this.hasMessage(result)) return result ?? null;
    const rest: Record<string, unknown> = { ...result };
    delete rest.message;
    return Object.keys(rest).length > 0 ? rest : null;
  }
}
