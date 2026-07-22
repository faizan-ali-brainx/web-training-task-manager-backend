import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TodosService } from './todos.service';

describe('TodosService', () => {
  let service: TodosService;
  let prisma: { todo: Record<string, jest.Mock> };

  beforeEach(async () => {
    prisma = {
      todo: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [TodosService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(TodosService);
  });

  describe('findAllForUser', () => {
    it("maps ownerId to userId and returns only the caller's todos", async () => {
      prisma.todo.findMany.mockResolvedValue([
        {
          id: 1,
          title: 'A',
          completed: false,
          ownerId: 5,
          createdAt: new Date('2026-01-01'),
        },
      ]);

      const result = await service.findAllForUser(5);

      expect(prisma.todo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ownerId: 5 } }),
      );
      expect(result).toEqual([
        {
          id: 1,
          userId: 5,
          title: 'A',
          completed: false,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]);
    });
  });

  describe('update', () => {
    it('throws 404 when the todo does not exist', async () => {
      prisma.todo.findUnique.mockResolvedValue(null);

      await expect(service.update(1, 999, { completed: true })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws 403 when the todo belongs to a different user', async () => {
      prisma.todo.findUnique.mockResolvedValue({ id: 1, ownerId: 2 });

      await expect(service.update(1, 1, { completed: true })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('updates the todo when the caller is the owner', async () => {
      prisma.todo.findUnique.mockResolvedValue({ id: 1, ownerId: 1 });
      prisma.todo.update.mockResolvedValue({
        id: 1,
        title: 'A',
        completed: true,
        ownerId: 1,
        createdAt: new Date('2026-01-01'),
      });

      const result = await service.update(1, 1, { completed: true });

      expect(result.completed).toBe(true);
    });
  });

  describe('remove', () => {
    it('throws 403 when the todo belongs to a different user', async () => {
      prisma.todo.findUnique.mockResolvedValue({ id: 1, ownerId: 2 });

      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
      expect(prisma.todo.delete).not.toHaveBeenCalled();
    });
  });
});
