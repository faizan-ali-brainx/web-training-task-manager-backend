import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicUser, type PublicUser } from '../users/user.mapper';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import type { AuthResponseDto } from './dto/auth-response.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { MessageResponseDto } from './dto/message-response.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { SignupDto } from './dto/signup.dto';
import type { VerifyEmailDto } from './dto/verify-email.dto';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Orchestrates the full auth flow: signup, email verification, login,
 * logout, session lookup, and forgot/reset password. Mirrors the frontend's
 * mock API contract exactly (see docs/BACKEND_DEVELOPMENT_PLAN.md §5).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly mail: MailService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signup(dto: SignupDto): Promise<MessageResponseDto> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing)
      throw new ConflictException('An account with this email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });

    const token = await this.createEmailVerificationToken(user.id);
    await this.mail.sendVerificationEmail(user.email, token);

    return {
      message: 'Account created — check your email to verify.',
      ...this.devOnly({ verificationToken: token }),
    };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<MessageResponseDto> {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token: dto.token },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification link');
    }

    await this.users.markEmailVerified(record.userId);
    await this.prisma.emailVerificationToken.delete({
      where: { id: record.id },
    });

    return { message: 'Email verified.' };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Please verify your email before logging in',
      );
    }

    const accessToken = this.jwt.sign({ sub: user.id, email: user.email });
    return { user: toPublicUser(user), accessToken };
  }

  // JWTs are stateless — there's no server-side session to destroy yet.
  // Placeholder for future token-blocklist/refresh-token revocation.
  logout(): MessageResponseDto {
    return { message: 'Logged out.' };
  }

  async getCurrentUser(userId: number): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('Not authenticated');
    return toPublicUser(user);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    const user = await this.users.findByEmail(dto.email);
    if (!user)
      throw new BadRequestException('No account found with this email');

    const token = await this.createPasswordResetToken(user.id);
    await this.mail.sendPasswordResetEmail(user.email, token);

    return {
      message: 'A password reset link would be sent to your email.',
      ...this.devOnly({ resetToken: token }),
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<MessageResponseDto> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.users.updatePassword(record.userId, passwordHash);
    await this.prisma.passwordResetToken.delete({ where: { id: record.id } });

    return { message: 'Password reset.' };
  }

  private async createEmailVerificationToken(userId: number): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: { token, userId, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    });
    return token;
  }

  private async createPasswordResetToken(userId: number): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: { token, userId, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    });
    return token;
  }

  // Only include a raw token in the response outside production — see
  // docs/BACKEND_DEVELOPMENT_PLAN.md §5.1 for why.
  private devOnly<T extends object>(fields: T): Partial<T> {
    return this.config.get<string>('NODE_ENV') === 'production' ? {} : fields;
  }
}
