import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: { notification: Record<string, jest.Mock> };
  let gateway: { notifyUser: jest.Mock };

  const row = {
    id: 1,
    userId: 2,
    todoId: 3,
    type: 'COLLABORATOR_INVITED',
    message: 'hi',
    read: false,
    createdAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    gateway = { notifyUser: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  describe('create', () => {
    it('persists a notification and pushes it to the recipient in real time', async () => {
      prisma.notification.create.mockResolvedValue(row);

      const result = await service.create({
        userId: 2,
        type: 'COLLABORATOR_INVITED',
        message: 'hi',
        todoId: 3,
      });

      expect(result.id).toBe(1);
      expect(gateway.notifyUser).toHaveBeenCalledWith(2, result);
    });
  });

  describe('findAllForUser', () => {
    it('returns the mapped notifications for the user', async () => {
      prisma.notification.findMany.mockResolvedValue([row]);

      const result = await service.findAllForUser(2);

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 2 } }),
      );
      expect(result[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('markRead', () => {
    it('throws 404 when the notification does not exist', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);

      await expect(service.markRead(2, 99)).rejects.toThrow(NotFoundException);
    });

    it('throws 403 when the notification belongs to another user', async () => {
      prisma.notification.findUnique.mockResolvedValue({ ...row, userId: 7 });

      await expect(service.markRead(2, 1)).rejects.toThrow(ForbiddenException);
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it('marks the notification read for its recipient', async () => {
      prisma.notification.findUnique.mockResolvedValue(row);
      prisma.notification.update.mockResolvedValue({ ...row, read: true });

      const result = await service.markRead(2, 1);

      expect(result.read).toBe(true);
    });
  });
});
