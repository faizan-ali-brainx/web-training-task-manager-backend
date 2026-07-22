import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let auth: Record<string, jest.Mock>;

  beforeEach(async () => {
    auth = {
      signup: jest.fn(),
      verifyEmail: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      getCurrentUser: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: auth }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AuthController);
  });

  it('delegates signup to AuthService', async () => {
    const dto = { name: 'A', email: 'a@b.com', password: 'password123' };
    auth.signup.mockResolvedValue({ message: 'ok' });

    const result = await controller.signup(dto);

    expect(auth.signup).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ message: 'ok' });
  });

  it('delegates login to AuthService', async () => {
    const dto = { email: 'a@b.com', password: 'password123' };
    auth.login.mockResolvedValue({ user: { id: 1 }, accessToken: 'token' });

    const result = await controller.login(dto);

    expect(auth.login).toHaveBeenCalledWith(dto);
    expect(result.accessToken).toBe('token');
  });

  it('resolves the current user from the JWT-authenticated request', async () => {
    auth.getCurrentUser.mockResolvedValue({ id: 1, email: 'a@b.com' });

    const result = await controller.me({ userId: 1, email: 'a@b.com' });

    expect(auth.getCurrentUser).toHaveBeenCalledWith(1);
    expect(result.id).toBe(1);
  });
});
