import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  toPublicNotification,
  type PublicNotification,
} from './notification.mapper';
import { NotificationsGateway } from './notifications.gateway';

/** The fields needed to raise a new notification for a user. */
export interface CreateNotificationInput {
  userId: number;
  type: NotificationType;
  message: string;
  todoId?: number;
}

/**
 * Persists in-app notifications and pushes each new one to the recipient in
 * real time via NotificationsGateway. Reads are scoped to the recipient — a
 * user can only see and mark their own notifications.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  /**
   * Creates a notification and immediately pushes it over the WebSocket so an
   * online recipient sees it without polling.
   * @param input - the recipient, type, message, and optional related todo
   * @returns the created notification
   */
  async create(input: CreateNotificationInput): Promise<PublicNotification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        message: input.message,
        todoId: input.todoId ?? null,
      },
    });
    const publicNotification = toPublicNotification(notification);
    this.gateway.notifyUser(input.userId, publicNotification);
    return publicNotification;
  }

  /**
   * Lists a user's notifications, newest first.
   * @param userId - the recipient's id
   * @returns the user's notifications
   */
  async findAllForUser(userId: number): Promise<PublicNotification[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return notifications.map(toPublicNotification);
  }

  /**
   * Marks a single notification as read. The caller must be its recipient.
   * @param userId - the requesting user's id
   * @param id - the notification's id
   * @returns the updated notification
   * @throws NotFoundException if no notification has this id
   * @throws ForbiddenException if the caller isn't the recipient
   */
  async markRead(userId: number, id: number): Promise<PublicNotification> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification)
      throw new NotFoundException(`Notification ${id} not found`);
    if (notification.userId !== userId) {
      throw new ForbiddenException('That notification belongs to someone else');
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    return toPublicNotification(updated);
  }
}
