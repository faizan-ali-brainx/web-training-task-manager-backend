import type { User as PrismaUser } from '@prisma/client';

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  emailVerified: boolean;
}

/**
 * Strips the password hash (and any other internal fields) before a user
 * record ever leaves the service layer — mirrors the frontend mock's own
 * toPublicUser() and matches the frontend's `User` type exactly.
 */
export function toPublicUser(user: PrismaUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
  };
}
