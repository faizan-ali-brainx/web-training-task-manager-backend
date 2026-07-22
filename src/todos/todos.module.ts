import { Module } from '@nestjs/common';
import { TodosController } from './todos.controller';
import { TodosService } from './todos.service';

/** Todo CRUD — JwtAuthGuard works here without importing AuthModule, since
 * Passport's 'jwt' strategy is registered globally once AuthModule loads. */
@Module({
  controllers: [TodosController],
  providers: [TodosService],
})
export class TodosModule {}
