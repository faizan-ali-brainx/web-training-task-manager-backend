import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  type OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../auth/jwt.strategy';
import { NOTIFICATION_EVENT } from './notifications.constants';
import type { PublicNotification } from './notification.mapper';

/**
 * Socket.io gateway that pushes real-time notifications to connected clients.
 * Each socket authenticates once on connection and joins a private
 * `user:<id>` room; `notifyUser` then targets only that room. Guards don't
 * apply to WebSocket handshakes, so — uniquely in this codebase — the JWT is
 * verified by hand here (see docs/BACKEND_DEVELOPMENT_PLAN.md §7.4). CORS is
 * read from `process.env` because gateway decorators are evaluated before
 * Nest's DI container exists, so `ConfigService` isn't available yet.
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  constructor(private readonly jwt: JwtService) {}

  /**
   * Authenticates a newly connected socket from its handshake token and joins
   * it to a per-user room. An invalid/missing token disconnects the socket.
   * @param client - the connecting socket
   */
  handleConnection(client: Socket): void {
    try {
      const token = this.extractToken(client);
      const payload = this.jwt.verify<JwtPayload>(token);
      void client.join(this.roomFor(payload.sub));
    } catch {
      this.logger.warn(
        `Rejected socket ${client.id}: invalid or missing token`,
      );
      client.disconnect();
    }
  }

  /**
   * Pushes a notification to every socket a user has open.
   * @param userId - the recipient's id
   * @param payload - the notification to deliver
   */
  notifyUser(userId: number, payload: PublicNotification): void {
    this.server.to(this.roomFor(userId)).emit(NOTIFICATION_EVENT, payload);
  }

  /**
   * Reads the JWT from the socket handshake (`auth.token`, matching
   * socket.io-client's `auth` option).
   * @param client - the connecting socket
   * @returns the raw bearer token
   * @throws Error if no token is present
   */
  private extractToken(client: Socket): string {
    const token = client.handshake.auth?.token as unknown;
    if (typeof token !== 'string' || token.length === 0) {
      throw new Error('Missing handshake token');
    }
    return token;
  }

  /**
   * Builds the private room name for a user.
   * @param userId - the user's id
   * @returns the room name
   */
  private roomFor(userId: number): string {
    return `user:${userId}`;
  }
}
