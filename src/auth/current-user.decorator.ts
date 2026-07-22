import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { RequestUser } from './jwt.strategy';

/**
 * Param decorator exposing the JWT-authenticated user set by JwtStrategy,
 * e.g. `findAll(@CurrentUser() user: RequestUser)`, instead of reaching into
 * the raw Express request in every controller method.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    return request.user;
  },
);
