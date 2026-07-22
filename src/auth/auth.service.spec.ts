import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let users: Record<string, jest.Mock>;
  let prisma: {
    emailVerificationToken: Record<string, jest.Mock>;
    passwordResetToken: Record<string, jest.Mock>;
  };

  beforeEach(async () => {
    users = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      markEmailVerified: jest.fn(),
      updatePassword: jest.fn(),
    };
    prisma = {
      emailVerificationToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      passwordResetToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: users },
        {
          provide: MailService,
          useValue: {
            sendVerificationEmail: jest.fn(),
            sendPasswordResetEmail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(() => 'signed.jwt.token') },
        },
        { provide: ConfigService, useValue: { get: jest.fn(() => undefined) } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('signup', () => {
    it('creates a user and returns a verification token outside production', async () => {
      users.findByEmail.mockResolvedValue(null);
      users.create.mockResolvedValue({ id: 1, email: 'a@b.com' });
      prisma.emailVerificationToken.create.mockResolvedValue({});

      const result = await service.signup({
        name: 'A',
        email: 'a@b.com',
        password: 'password123',
      });

      expect(result.message).toBeDefined();
      expect(result.verificationToken).toBeDefined();
    });

    it('rejects a duplicate email with 409', async () => {
      users.findByEmail.mockResolvedValue({ id: 1 });

      await expect(
        service.signup({
          name: 'A',
          email: 'a@b.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('rejects an unknown email with 401', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'a@b.com', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an unverified user with 403', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      users.findByEmail.mockResolvedValue({
        id: 1,
        email: 'a@b.com',
        passwordHash,
        emailVerified: false,
      });

      await expect(
        service.login({ email: 'a@b.com', password: 'password123' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns a session for valid, verified credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      users.findByEmail.mockResolvedValue({
        id: 1,
        name: 'A',
        email: 'a@b.com',
        passwordHash,
        emailVerified: true,
      });

      const result = await service.login({
        email: 'a@b.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user.email).toBe('a@b.com');
    });
  });

  describe('verifyEmail', () => {
    it('rejects an expired token with 400', async () => {
      prisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: 1,
        userId: 1,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.verifyEmail({ token: 'expired' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
