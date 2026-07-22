import type { Todo as PrismaTodo } from '@prisma/client';

export interface PublicTodo {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
  createdAt: string;
}

/**
 * Maps the Prisma Todo row (which stores `ownerId`) to the shape the
 * frontend's `Todo` type expects (`userId`) — see
 * docs/BACKEND_DEVELOPMENT_PLAN.md §5.2 for why the DB column is named
 * differently (Part 2 introduces non-owner collaborators).
 */
export function toPublicTodo(todo: PrismaTodo): PublicTodo {
  return {
    id: todo.id,
    userId: todo.ownerId,
    title: todo.title,
    completed: todo.completed,
    createdAt: todo.createdAt.toISOString(),
  };
}
