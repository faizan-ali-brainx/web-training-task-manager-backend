import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

/**
 * Shared user lookups/mutations, consumed by AuthModule now and by the
 * Collaboration module in Part 2.
 */
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
