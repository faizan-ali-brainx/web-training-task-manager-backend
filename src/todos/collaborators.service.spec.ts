import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CollaboratorsService } from './collaborators.service';
import { TodosService } from './todos.service';

describe('CollaboratorsService', () => {
  let service: CollaboratorsService;
  let prisma: { todoCollaborator: Record<string, jest.Mock> };
  let todos: Record<string, jest.Mock>;
  let users: Record<string, jest.Mock>;
  let mail: Record<string, jest.Mock>;

  const ownedTodo = { id: 1, title: 'Shared task', ownerId: 1 };

  beforeEach(async () => {
    prisma = {
      todoCollaborator: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    todos = {
      findTodoOrThrow: jest.fn().mockResolvedValue(ownedTodo),
      assertIsOwner: jest.fn(),
      assertCanAccess: jest.fn(),
    };
    users = { findByEmail: jest.fn() };
    mail = { sendCollaboratorInvite: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        CollaboratorsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TodosService, useValue: todos },
        { provide: UsersService, useValue: users },
        { provide: MailService, useValue: mail },
      ],
    }).compile();

    service = module.get(CollaboratorsService);
  });

  describe('invite', () => {
    it('throws 403 when the caller is not the owner', async () => {
      todos.assertIsOwner.mockImplementation(() => {
        throw new ForbiddenException('Only the owner can do this');
      });

      await expect(service.invite(2, 1, 'friend@example.com')).rejects.toThrow(
        ForbiddenException,
      );
      expect(users.findByEmail).not.toHaveBeenCalled();
    });

    it('throws 404 when no user has that email', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(service.invite(1, 1, 'ghost@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws 409 when the user is already a collaborator', async () => {
      users.findByEmail.mockResolvedValue({
        id: 2,
        email: 'friend@example.com',
      });
      prisma.todoCollaborator.findUnique.mockResolvedValue({ id: 99 });

      await expect(service.invite(1, 1, 'friend@example.com')).rejects.toThrow(
        ConflictException,
      );
    });

    it('creates the collaborator and emails the invite when the caller is the owner', async () => {
      users.findByEmail.mockResolvedValue({
        id: 2,
        email: 'friend@example.com',
      });
      prisma.todoCollaborator.findUnique.mockResolvedValue(null);
      prisma.todoCollaborator.create.mockResolvedValue({
        id: 5,
        todoId: 1,
        userId: 2,
        invitedBy: 1,
        createdAt: new Date('2026-01-01'),
        user: {
          id: 2,
          name: 'Friend',
          email: 'friend@example.com',
          emailVerified: true,
        },
      });

      const result = await service.invite(1, 1, 'friend@example.com');

      expect(prisma.todoCollaborator.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { todoId: 1, userId: 2, invitedBy: 1 },
        }),
      );
      expect(mail.sendCollaboratorInvite).toHaveBeenCalledWith(
        'friend@example.com',
        'Shared task',
      );
      expect(result.user.email).toBe('friend@example.com');
    });
  });

  describe('list', () => {
    it('throws 403 when the caller cannot access the todo', async () => {
      todos.assertCanAccess.mockRejectedValue(
        new ForbiddenException('You do not have access to this todo'),
      );

      await expect(service.list(3, 1)).rejects.toThrow(ForbiddenException);
    });

    it('returns collaborators as public users', async () => {
      prisma.todoCollaborator.findMany.mockResolvedValue([
        {
          user: {
            id: 2,
            name: 'Friend',
            email: 'friend@example.com',
            emailVerified: true,
          },
        },
      ]);

      const result = await service.list(1, 1);

      expect(result).toEqual([
        {
          id: 2,
          name: 'Friend',
          email: 'friend@example.com',
          emailVerified: true,
        },
      ]);
    });
  });

  describe('remove', () => {
    it('throws 403 when the caller is not the owner', async () => {
      todos.assertIsOwner.mockImplementation(() => {
        throw new ForbiddenException('Only the owner can do this');
      });

      await expect(service.remove(2, 1, 2)).rejects.toThrow(ForbiddenException);
      expect(prisma.todoCollaborator.deleteMany).not.toHaveBeenCalled();
    });

    it('throws 404 when the target user is not a collaborator', async () => {
      prisma.todoCollaborator.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.remove(1, 1, 99)).rejects.toThrow(NotFoundException);
    });

    it('removes the collaborator when the caller is the owner', async () => {
      prisma.todoCollaborator.deleteMany.mockResolvedValue({ count: 1 });

      await expect(service.remove(1, 1, 2)).resolves.toBeUndefined();
    });
  });
});
