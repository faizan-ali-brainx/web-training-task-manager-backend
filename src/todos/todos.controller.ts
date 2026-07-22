import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestUser } from '../auth/jwt.strategy';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import type { PublicTodo } from './todo.mapper';
import { TodosService } from './todos.service';

/** Todo CRUD endpoints — every route requires a valid JWT and is scoped to the caller. */
@ApiTags('todos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('todos')
export class TodosController {
  constructor(private readonly todos: TodosService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's todos" })
  findAll(@CurrentUser() user: RequestUser): Promise<PublicTodo[]> {
    return this.todos.findAllForUser(user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new todo' })
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTodoDto,
  ): Promise<PublicTodo> {
    return this.todos.create(user.userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update a todo (title and/or completed)' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTodoDto,
  ): Promise<PublicTodo> {
    return this.todos.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a todo' })
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.todos.remove(user.userId, id);
  }
}
