import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { DeadlineReminderService } from './deadline-reminder.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

/**
 * Part 3 — in-app + real-time notifications and the deadline-reminder cron.
 * Imports AuthModule for the JwtService the gateway uses to verify socket
 * handshakes, and MailModule for the reminder email. NotificationsService is
 * exported so TodosModule (collaborator invites) can raise notifications too.
 */
@Module({
  imports: [AuthModule, MailModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    DeadlineReminderService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
