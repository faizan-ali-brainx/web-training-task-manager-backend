import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
}

/**
 * Data-access layer for User records. Contains no HTTP or auth-flow concerns —
 * AuthService orchestrates those using these lookups/mutations.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Looks up a user by email. Case-insensitive — Postgres `TEXT` equality is
   * case-sensitive, and without normalizing here `User@x.com`/`user@x.com`
   * would slip past the `@unique` constraint as two different rows.
   * @param email - the email to look up, any casing
   * @returns the matching user, or null
   */
  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
    });
  }

  /**
   * Looks up a user by id.
   * @param id - the user's id
   * @returns the matching user, or null
   */
  findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /**
   * Creates a new, unverified user. The email is normalized to lowercase
   * before storing, for the same reason findByEmail normalizes on read.
   * @param data - the new user's name/email/password hash
   * @returns the created user
   */
  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({
      data: {
        ...data,
        email: normalizeEmail(data.email),
        emailVerified: false,
      },
    });
  }

  /**
   * Marks a user's email as verified.
   * @param userId - the user's id
   * @returns the updated user
   */
  markEmailVerified(userId: number): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  }

  /**
   * Updates a user's password hash.
   * @param userId - the user's id
   * @param passwordHash - the new bcrypt hash
   * @returns the updated user
   */
  updatePassword(userId: number, passwordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
