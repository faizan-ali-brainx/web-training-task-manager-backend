import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { CollaboratorsController } from './collaborators.controller';
import { CollaboratorsService } from './collaborators.service';
import { TodosController } from './todos.controller';
import { TodosService } from './todos.service';

/** Todo CRUD + collaboration — JwtAuthGuard works here without importing
 * AuthModule, since Passport's 'jwt' strategy is registered globally once
 * AuthModule loads. UsersModule/MailModule are needed for invite-by-email
 * lookups and the collaborator-invite email; NotificationsModule raises the
 * in-app/real-time collaborator-invite notification. */
@Module({
  imports: [UsersModule, MailModule, NotificationsModule],
  controllers: [TodosController, CollaboratorsController],
  providers: [TodosService, CollaboratorsService],
})
export class TodosModule {}
