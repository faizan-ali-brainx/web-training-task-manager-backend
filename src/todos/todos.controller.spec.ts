import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TodosController } from './todos.controller';
import { TodosService } from './todos.service';

describe('TodosController', () => {
  let controller: TodosController;
  let todos: Record<string, jest.Mock>;
  const user = { userId: 1, email: 'a@b.com' };

  beforeEach(async () => {
    todos = {
      findAllForUser: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [TodosController],
      providers: [{ provide: TodosService, useValue: todos }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(TodosController);
  });

  it('scopes findAll to the current user', async () => {
    todos.findAllForUser.mockResolvedValue([]);

    await controller.findAll(user);

    expect(todos.findAllForUser).toHaveBeenCalledWith(1);
  });

  it('scopes create to the current user', async () => {
    const dto = { title: 'New todo' };
    todos.create.mockResolvedValue({
      id: 1,
      userId: 1,
      title: 'New todo',
      completed: false,
      createdAt: 'now',
    });

    await controller.create(user, dto);

    expect(todos.create).toHaveBeenCalledWith(1, dto);
  });

  it('scopes update to the current user and id', async () => {
    const dto = { completed: true };
    todos.update.mockResolvedValue({
      id: 5,
      userId: 1,
      title: 'X',
      completed: true,
      createdAt: 'now',
    });

    await controller.update(user, 5, dto);

    expect(todos.update).toHaveBeenCalledWith(1, 5, dto);
  });

  it('scopes remove to the current user and id', async () => {
    await controller.remove(user, 5);

    expect(todos.remove).toHaveBeenCalledWith(1, 5);
  });
});
