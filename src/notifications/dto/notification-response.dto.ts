import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

/**
 * In-app notification shape returned by `GET /notifications` /
 * `PATCH /:id/read` and pushed verbatim over the WebSocket `notification` event.
 */
export class NotificationResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 2, description: 'The recipient user id' })
  userId!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 1,
    description: 'The related todo id, or null',
  })
  todoId!: number | null;

  @ApiProperty({
    enum: NotificationType,
    example: NotificationType.DEADLINE_REMINDER,
  })
  type!: NotificationType;

  @ApiProperty({ example: '"Buy groceries" is due 8/1/2026, 3:30:00 PM' })
  message!: string;

  @ApiProperty({ example: false })
  read!: boolean;

  @ApiProperty({ example: '2026-07-29T12:00:00.000Z' })
  createdAt!: string;
}
