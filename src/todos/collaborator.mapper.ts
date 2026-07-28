import type { TodoCollaborator, User as PrismaUser } from '@prisma/client';
import { toPublicUser, type PublicUser } from '../users/user.mapper';

export interface PublicCollaborator {
  id: number;
  todoId: number;
  invitedBy: number;
  createdAt: string;
  user: PublicUser;
}

type CollaboratorWithUser = TodoCollaborator & { user: PrismaUser };

/** Maps a TodoCollaborator row (with its joined User) to the API response shape. */
export function toPublicCollaborator(
  collaborator: CollaboratorWithUser,
): PublicCollaborator {
  return {
    id: collaborator.id,
    todoId: collaborator.todoId,
    invitedBy: collaborator.invitedBy,
    createdAt: collaborator.createdAt.toISOString(),
    user: toPublicUser(collaborator.user),
  };
}
