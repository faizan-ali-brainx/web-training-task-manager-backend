import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicUser, type PublicUser } from '../users/user.mapper';
import { UsersService } from '../users/users.service';
import {
  toPublicCollaborator,
  type PublicCollaborator,
} from './collaborator.mapper';
import { TodosService } from './todos.service';

/**
 * Manages who else can access a todo. Invite/remove are owner-only; list is
 * open to the owner and any existing collaborator. Access checks are reused
 * from TodosService so ownership logic isn't duplicated.
 */
@Injectable()
export class CollaboratorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly todos: TodosService,
    private readonly users: UsersService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Invites a user onto a todo by email. Owner-only.
   * @param ownerId - the requesting user's id
   * @param todoId - the todo's id
   * @param email - the invitee's email address
   * @returns the created collaborator record
   * @throws ForbiddenException if the caller isn't the owner
   * @throws NotFoundException if no user has this email
   * @throws ConflictException if the user is already a collaborator
   */
  async invite(
    ownerId: number,
    todoId: number,
    email: string,
  ): Promise<PublicCollaborator> {
    const todo = await this.todos.findTodoOrThrow(todoId);
    this.todos.assertIsOwner(todo, ownerId);

    const invitee = await this.users.findByEmail(email);
    if (!invitee) throw new NotFoundException(`No user with email ${email}`);

    const existing = await this.prisma.todoCollaborator.findUnique({
      where: { todoId_userId: { todoId, userId: invitee.id } },
    });
    if (existing) {
      throw new ConflictException('That user is already a collaborator');
    }

    const collaborator = await this.prisma.todoCollaborator.create({
      data: { todoId, userId: invitee.id, invitedBy: ownerId },
      include: { user: true },
    });

    await this.mail.sendCollaboratorInvite(invitee.email, todo.title);
    await this.notifications.create({
      userId: invitee.id,
      todoId,
      type: NotificationType.COLLABORATOR_INVITED,
      message: `You were added as a collaborator on "${todo.title}"`,
    });
    return toPublicCollaborator(collaborator);
  }

  /**
   * Lists a todo's collaborators. Open to the owner or any collaborator.
   * @param userId - the requesting user's id
   * @param todoId - the todo's id
   * @returns the collaborators, oldest invite first
   * @throws ForbiddenException if the caller has no access to this todo
   */
  async list(userId: number, todoId: number): Promise<PublicUser[]> {
    const todo = await this.todos.findTodoOrThrow(todoId);
    await this.todos.assertCanAccess(todo, userId);

    const collaborators = await this.prisma.todoCollaborator.findMany({
      where: { todoId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
    return collaborators.map((c) => toPublicUser(c.user));
  }

  /**
   * Removes a collaborator from a todo. Owner-only.
   * @param ownerId - the requesting user's id
   * @param todoId - the todo's id
   * @param collaboratorUserId - the collaborator's user id to remove
   * @throws ForbiddenException if the caller isn't the owner
   * @throws NotFoundException if that user isn't a collaborator on this todo
   */
  async remove(
    ownerId: number,
    todoId: number,
    collaboratorUserId: number,
  ): Promise<void> {
    const todo = await this.todos.findTodoOrThrow(todoId);
    this.todos.assertIsOwner(todo, ownerId);

    const { count } = await this.prisma.todoCollaborator.deleteMany({
      where: { todoId, userId: collaboratorUserId },
    });
    if (count === 0) {
      throw new NotFoundException(
        'That user is not a collaborator on this todo',
      );
    }
  }
}
