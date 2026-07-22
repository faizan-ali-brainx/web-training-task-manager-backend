import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * Wraps the Nodemailer transport used for verification/reset emails (Part 1)
 * and, later, deadline reminders and collaborator invites (Parts 2-3).
 */
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
