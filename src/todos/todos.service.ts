import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Todo as PrismaTodo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { toPublicTodo, type PublicTodo } from './todo.mapper';

/**
 * CRUD for Todo items, scoped to the authenticated user. Part 1 enforces
 * strict ownership (see findOwnedOrThrow) — Part 2 relaxes this to
 * owner-or-collaborator for reads/status-toggles.
 */
@Injectable()
export class TodosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: number): Promise<PublicTodo[]> {
    const todos = await this.prisma.todo.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'asc' },
    });
    return todos.map(toPublicTodo);
  }

  async create(userId: number, dto: CreateTodoDto): Promise<PublicTodo> {
    const todo = await this.prisma.todo.create({
      data: { title: dto.title, ownerId: userId },
    });
    return toPublicTodo(todo);
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateTodoDto,
  ): Promise<PublicTodo> {
    await this.findOwnedOrThrow(userId, id);
    const todo = await this.prisma.todo.update({ where: { id }, data: dto });
    return toPublicTodo(todo);
  }

  async remove(userId: number, id: number): Promise<void> {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.todo.delete({ where: { id } });
  }

  private async findOwnedOrThrow(
    userId: number,
    id: number,
  ): Promise<PrismaTodo> {
    const todo = await this.prisma.todo.findUnique({ where: { id } });
    if (!todo) throw new NotFoundException(`Todo ${id} not found`);
    if (todo.ownerId !== userId)
      throw new ForbiddenException('You do not own this todo');
    return todo;
  }
}
