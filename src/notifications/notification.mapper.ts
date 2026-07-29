import type {
  Notification as PrismaNotification,
  NotificationType,
} from '@prisma/client';

export interface PublicNotification {
  id: number;
  userId: number;
  todoId: number | null;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: string;
}

/**
 * Maps a Prisma Notification row to the API/socket response shape — `Date`
 * fields become ISO strings so the payload is identical whether it's returned
 * from `GET /notifications` or pushed over the WebSocket.
 * @param notification - the Prisma Notification row
 * @returns the serializable notification
 */
export function toPublicNotification(
  notification: PrismaNotification,
): PublicNotification {
  return {
    id: notification.id,
    userId: notification.userId,
    todoId: notification.todoId,
    type: notification.type,
    message: notification.message,
    read: notification.read,
    createdAt: notification.createdAt.toISOString(),
  };
}
