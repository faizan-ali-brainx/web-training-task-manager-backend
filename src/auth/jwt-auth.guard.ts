import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Thin named wrapper around AuthGuard('jwt') so protected controllers read
 * `@UseGuards(JwtAuthGuard)` instead of a magic string.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
