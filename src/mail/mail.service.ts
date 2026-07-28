import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Sends transactional emails via SMTP (Nodemailer). Send failures are logged,
 * not thrown — a misconfigured/unreachable SMTP server should never fail the
 * signup/forgot-password request itself, since dev environments also return
 * the raw token in the response as a fallback (see AuthService).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    this.frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: Number(this.config.get<string>('SMTP_PORT')) || 587,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendVerificationEmail(toEmail: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/verify-email?token=${token}`;
    await this.send(
      toEmail,
      'Verify your email',
      `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
    );
  }

  async sendPasswordResetEmail(toEmail: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/reset-password?token=${token}`;
    await this.send(
      toEmail,
      'Reset your password',
      `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
    );
  }

  async sendCollaboratorInvite(
    toEmail: string,
    todoTitle: string,
  ): Promise<void> {
    await this.send(
      toEmail,
      'You were invited to collaborate on a task',
      `<p>You've been added as a collaborator on "${todoTitle}". Log in to view it.</p>`,
    );
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: '"Task Manager" <no-reply@taskmanager.local>',
        to,
        subject,
        html,
      });
    } catch (err) {
      this.logger.warn(
        `Failed to send email to ${to}: ${(err as Error).message}`,
      );
    }
  }
}
