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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestUser } from '../auth/jwt.strategy';
import { CreateTodoDto } from './dto/create-todo.dto';
import { TodoResponseDto } from './dto/todo-response.dto';
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
  @ApiOperation({ summary: "List the current user's todos (owned + shared)" })
  @ApiOkResponse({ type: TodoResponseDto, isArray: true })
  findAll(@CurrentUser() user: RequestUser): Promise<PublicTodo[]> {
    return this.todos.findAllForUser(user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new todo' })
  @ApiCreatedResponse({ type: TodoResponseDto })
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTodoDto,
  ): Promise<PublicTodo> {
    return this.todos.create(user.userId, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Partially update a todo (title, completed, and/or deadline)',
  })
  @ApiOkResponse({ type: TodoResponseDto })
  @ApiResponse({
    status: 400,
    description: 'The supplied deadline is not a future date',
  })
  @ApiResponse({
    status: 403,
    description: 'Editing title/deadline is owner-only',
  })
  @ApiResponse({ status: 404, description: 'No todo with that id' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTodoDto,
  ): Promise<PublicTodo> {
    return this.todos.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a todo (owner only)' })
  @ApiNoContentResponse({ description: 'Todo deleted' })
  @ApiResponse({ status: 403, description: 'Only the owner can delete' })
  @ApiResponse({ status: 404, description: 'No todo with that id' })
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.todos.remove(user.userId, id);
  }
}
