import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  NotificationType,
  type Todo,
  type TodoCollaborator,
  type User,
} from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_REMINDER_WINDOW_HOURS,
  MS_PER_HOUR,
} from './notifications.constants';
import { NotificationsService } from './notifications.service';

/** A todo joined with everyone who should be reminded about it. */
type TodoWithRecipients = Todo & {
  owner: User;
  collaborators: (TodoCollaborator & { user: User })[];
};

/**
 * Hourly cron that emails + notifies the owner and collaborators of any todo
 * whose deadline falls within the configured look-ahead window. `reminderSentAt`
 * dedupes so each todo is reminded at most once (reset when its deadline
 * changes — see TodosService.update).
 */
@Injectable()
export class DeadlineReminderService {
  private readonly logger = new Logger(DeadlineReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Finds every todo due within the reminder window that hasn't been reminded
   * yet, and reminds each one. Runs once an hour.
   */
  // TODO: TEMPORARY — every 30s for manual testing. Revert to
  // CronExpression.EVERY_HOUR before committing.
  @Cron(CronExpression.EVERY_30_SECONDS)
  async sendDueReminders(): Promise<void> {
    const due = await this.findDueTodos();
    for (const todo of due) {
      await this.remindForTodo(todo);
    }
    if (due.length > 0) {
      this.logger.log(`Sent deadline reminders for ${due.length} todo(s)`);
    }
  }

  /**
   * Queries todos due between now and the window cutoff with no reminder sent.
   * @returns the due todos, each with its owner and collaborators joined
   */
  private findDueTodos(): Promise<TodoWithRecipients[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() + this.windowHours() * MS_PER_HOUR);
    return this.prisma.todo.findMany({
      where: {
        reminderSentAt: null,
        deadline: { not: null, gte: now, lte: cutoff },
      },
      include: { owner: true, collaborators: { include: { user: true } } },
    });
  }

  /**
   * Reminds every recipient of one todo, then marks it as reminded.
   * @param todo - the due todo with its recipients joined
   */
  private async remindForTodo(todo: TodoWithRecipients): Promise<void> {
    if (!todo.deadline) return;
    const recipients = [todo.owner, ...todo.collaborators.map((c) => c.user)];
    for (const user of recipients) {
      await this.remindUser(user, todo.id, todo.title, todo.deadline);
    }
    await this.prisma.todo.update({
      where: { id: todo.id },
      data: { reminderSentAt: new Date() },
    });
  }

  /**
   * Sends one recipient the reminder email (best-effort) and an in-app
   * notification.
   * @param user - the recipient
   * @param todoId - the todo's id
   * @param title - the todo's title
   * @param deadline - the todo's deadline
   */
  private async remindUser(
    user: User,
    todoId: number,
    title: string,
    deadline: Date,
  ): Promise<void> {
    const when = deadline.toLocaleString();
    try {
      await this.mail.sendDeadlineReminder(user.email, title, when);
    } catch (err) {
      this.logger.warn(
        `Deadline email to ${user.email} failed: ${(err as Error).message}`,
      );
    }
    await this.notifications.create({
      userId: user.id,
      todoId,
      type: NotificationType.DEADLINE_REMINDER,
      message: `"${title}" is due ${when}`,
    });
  }

  /**
   * Resolves the reminder look-ahead window in hours from config, falling back
   * to the default when unset or invalid.
   * @returns the window size in hours
   */
  private windowHours(): number {
    const raw = Number(
      this.config.get<string>('DEADLINE_REMINDER_WINDOW_HOURS'),
    );
    return Number.isFinite(raw) && raw > 0
      ? raw
      : DEFAULT_REMINDER_WINDOW_HOURS;
  }
}
