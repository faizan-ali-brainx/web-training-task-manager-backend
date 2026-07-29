import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let notifications: Record<string, jest.Mock>;
  const user = { userId: 2, email: 'a@b.com' };

  beforeEach(async () => {
    notifications = {
      findAllForUser: jest.fn(),
      markRead: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: notifications }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(NotificationsController);
  });

  it("lists the current user's notifications", async () => {
    notifications.findAllForUser.mockResolvedValue([]);

    await controller.findAll(user);

    expect(notifications.findAllForUser).toHaveBeenCalledWith(2);
  });

  it('marks a notification read for the current user', async () => {
    notifications.markRead.mockResolvedValue({ id: 5, read: true });

    await controller.markRead(user, 5);

    expect(notifications.markRead).toHaveBeenCalledWith(2, 5);
  });
});
