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
 * CRUD for Todo items. Part 2 relaxes Part 1's strict ownership to
 * owner-or-collaborator for reads and completed-toggles, while title edits
 * and deletes stay owner-only — see assertIsOwner/assertCanAccess, which
 * CollaboratorsService also reuses for its own access checks.
 */
@Injectable()
export class TodosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists every todo the user can see — owned or collaborated-on.
   * @param userId - the requesting user's id
   * @returns todos ordered by creation time, oldest first
   */
  async findAllForUser(userId: number): Promise<PublicTodo[]> {
    const todos = await this.prisma.todo.findMany({
      where: {
        OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }],
      },
      orderBy: { createdAt: 'asc' },
    });
    return todos.map(toPublicTodo);
  }

  /**
   * Creates a new todo owned by the given user.
   * @param userId - the owner's id
   * @param dto - the todo's initial title
   * @returns the created todo
   */
  async create(userId: number, dto: CreateTodoDto): Promise<PublicTodo> {
    const todo = await this.prisma.todo.create({
      data: { title: dto.title, ownerId: userId },
    });
    return toPublicTodo(todo);
  }

  /**
   * Partially updates a todo. Renaming (`title`) is owner-only; toggling
   * `completed` is open to the owner or any collaborator.
   * @param userId - the requesting user's id
   * @param id - the todo's id
   * @param dto - the fields to update
   * @returns the updated todo
   * @throws NotFoundException if the todo doesn't exist
   * @throws ForbiddenException if the caller isn't allowed to make this change
   */
  async update(
    userId: number,
    id: number,
    dto: UpdateTodoDto,
  ): Promise<PublicTodo> {
    const todo = await this.findTodoOrThrow(id);
    if (dto.title !== undefined) {
      this.assertIsOwner(todo, userId);
    } else {
      await this.assertCanAccess(todo, userId);
    }
    const updated = await this.prisma.todo.update({ where: { id }, data: dto });
    return toPublicTodo(updated);
  }

  /**
   * Deletes a todo. Owner-only.
   * @param userId - the requesting user's id
   * @param id - the todo's id
   * @throws NotFoundException if the todo doesn't exist
   * @throws ForbiddenException if the caller isn't the owner
   */
  async remove(userId: number, id: number): Promise<void> {
    const todo = await this.findTodoOrThrow(id);
    this.assertIsOwner(todo, userId);
    await this.prisma.todo.delete({ where: { id } });
  }

  /**
   * Looks up a todo by id, or throws if it doesn't exist. Exposed (not
   * private) so CollaboratorsService can reuse the same lookup.
   * @param id - the todo's id
   * @returns the todo row
   * @throws NotFoundException if no todo has this id
   */
  async findTodoOrThrow(id: number): Promise<PrismaTodo> {
    const todo = await this.prisma.todo.findUnique({ where: { id } });
    if (!todo) throw new NotFoundException(`Todo ${id} not found`);
    return todo;
  }

  /**
   * Asserts the given user owns the todo.
   * @param todo - the todo to check
   * @param userId - the requesting user's id
   * @throws ForbiddenException if the user isn't the owner
   */
  assertIsOwner(todo: PrismaTodo, userId: number): void {
    if (todo.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can do this');
    }
  }

  /**
   * Asserts the given user may view/interact with the todo — true for the
   * owner or any invited collaborator.
   * @param todo - the todo to check
   * @param userId - the requesting user's id
   * @throws ForbiddenException if the user has no access to this todo
   */
  async assertCanAccess(todo: PrismaTodo, userId: number): Promise<void> {
    if (todo.ownerId === userId) return;
    const collaborator = await this.prisma.todoCollaborator.findUnique({
      where: { todoId_userId: { todoId: todo.id, userId } },
    });
    if (!collaborator) {
      throw new ForbiddenException('You do not have access to this todo');
    }
  }
}
