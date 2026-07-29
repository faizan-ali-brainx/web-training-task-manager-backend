import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestUser } from '../auth/jwt.strategy';
import { NotificationResponseDto } from './dto/notification-response.dto';
import type { PublicNotification } from './notification.mapper';
import { NotificationsService } from './notifications.service';

/** In-app notification endpoints — every route requires a valid JWT and is scoped to the caller. */
@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /**
   * Lists the current user's notifications, newest first.
   * @param user - the authenticated caller
   * @returns the caller's notifications
   */
  @Get()
  @ApiOperation({ summary: "List the current user's notifications" })
  @ApiOkResponse({
    type: NotificationResponseDto,
    isArray: true,
    description: "The caller's notifications, newest first",
  })
  findAll(@CurrentUser() user: RequestUser): Promise<PublicNotification[]> {
    return this.notifications.findAllForUser(user.userId);
  }

  /**
   * Marks one of the caller's notifications as read.
   * @param user - the authenticated caller
   * @param id - the notification's id
   * @returns the updated notification
   */
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiOkResponse({ type: NotificationResponseDto })
  @ApiResponse({
    status: 403,
    description: 'The notification belongs to another user',
  })
  @ApiResponse({ status: 404, description: 'No notification with that id' })
  markRead(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PublicNotification> {
    return this.notifications.markRead(user.userId, id);
  }
}
