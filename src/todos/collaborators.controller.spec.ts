import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CollaboratorsController } from './collaborators.controller';
import { CollaboratorsService } from './collaborators.service';

describe('CollaboratorsController', () => {
  let controller: CollaboratorsController;
  let collaborators: Record<string, jest.Mock>;
  const user = { userId: 1, email: 'a@b.com' };

  beforeEach(async () => {
    collaborators = {
      invite: jest.fn(),
      list: jest.fn(),
      remove: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [CollaboratorsController],
      providers: [{ provide: CollaboratorsService, useValue: collaborators }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(CollaboratorsController);
  });

  it('invites a collaborator by email on the given todo', async () => {
    const dto = { email: 'friend@example.com' };
    collaborators.invite.mockResolvedValue({ id: 1 });

    await controller.invite(user, 5, dto);

    expect(collaborators.invite).toHaveBeenCalledWith(
      1,
      5,
      'friend@example.com',
    );
  });

  it('lists collaborators for the given todo', async () => {
    collaborators.list.mockResolvedValue([]);

    await controller.list(user, 5);

    expect(collaborators.list).toHaveBeenCalledWith(1, 5);
  });

  it('removes a collaborator from the given todo', async () => {
    await controller.remove(user, 5, 2);

    expect(collaborators.remove).toHaveBeenCalledWith(1, 5, 2);
  });
});
