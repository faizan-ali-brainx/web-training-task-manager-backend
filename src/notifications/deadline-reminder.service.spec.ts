import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeadlineReminderService } from './deadline-reminder.service';
import { NotificationsService } from './notifications.service';

describe('DeadlineReminderService', () => {
  let service: DeadlineReminderService;
  let prisma: { todo: Record<string, jest.Mock> };
  let mail: { sendDeadlineReminder: jest.Mock };
  let notifications: { create: jest.Mock };

  const dueTodo = {
    id: 1,
    title: 'Ship it',
    deadline: new Date('2026-12-31'),
    owner: { id: 1, email: 'owner@example.com' },
    collaborators: [{ user: { id: 2, email: 'collab@example.com' } }],
  };

  beforeEach(async () => {
    prisma = { todo: { findMany: jest.fn(), update: jest.fn() } };
    mail = { sendDeadlineReminder: jest.fn() };
    notifications = { create: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        DeadlineReminderService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
        { provide: NotificationsService, useValue: notifications },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get(DeadlineReminderService);
  });

  it('emails + notifies the owner and every collaborator, then marks the todo reminded once', async () => {
    prisma.todo.findMany.mockResolvedValue([dueTodo]);

    await service.sendDueReminders();

    // owner + 1 collaborator = 2 recipients
    expect(mail.sendDeadlineReminder).toHaveBeenCalledTimes(2);
    expect(notifications.create).toHaveBeenCalledTimes(2);
    // reminded exactly once per todo (the update stamps reminderSentAt so a
    // later run won't remind again)
    expect(prisma.todo.update).toHaveBeenCalledTimes(1);
    expect(prisma.todo.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
  });

  it('does nothing when no todos are due', async () => {
    prisma.todo.findMany.mockResolvedValue([]);

    await service.sendDueReminders();

    expect(mail.sendDeadlineReminder).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
    expect(prisma.todo.update).not.toHaveBeenCalled();
  });
});
