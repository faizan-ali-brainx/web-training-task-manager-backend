import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as handlebars from 'handlebars';
import * as nodemailer from 'nodemailer';

type TemplateName = 'verify-email' | 'reset-password';

/**
 * Sends transactional emails via SMTP (Nodemailer), rendered from Handlebars
 * templates under `mail/templates/`. Send failures are logged, not thrown —
 * a misconfigured/unreachable SMTP server should never fail the
 * signup/forgot-password request itself, since dev environments also return
 * the raw token in the response as a fallback (see AuthService).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly frontendUrl: string;
  private readonly compiledTemplates = new Map<
    TemplateName,
    HandlebarsTemplateDelegate
  >();

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

  /**
   * Sends the "verify your email" message.
   * @param toEmail - the recipient's email address
   * @param token - the verification token to embed in the link
   */
  async sendVerificationEmail(toEmail: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/verify-email?token=${token}`;
    const html = this.render('verify-email', { url });
    await this.send(toEmail, 'Verify your email', html);
  }

  /**
   * Sends the "reset your password" message.
   * @param toEmail - the recipient's email address
   * @param token - the reset token to embed in the link
   */
  async sendPasswordResetEmail(toEmail: string, token: string): Promise<void> {
    const url = `${this.frontendUrl}/reset-password?token=${token}`;
    const html = this.render('reset-password', { url });
    await this.send(toEmail, 'Reset your password', html);
  }

  /**
   * Renders a named template with the given context.
   * @param name - the template's filename, without extension
   * @param context - the values to interpolate into the template
   * @returns the rendered HTML
   */
  private render(name: TemplateName, context: Record<string, string>): string {
    return this.compile(name)(context);
  }

  /**
   * Compiles (and caches) a Handlebars template from `mail/templates/`.
   * @param name - the template's filename, without extension
   * @returns the compiled template function
   */
  private compile(name: TemplateName): HandlebarsTemplateDelegate {
    const cached = this.compiledTemplates.get(name);
    if (cached) return cached;

    const path = join(__dirname, 'templates', `${name}.hbs`);
    const compiled = handlebars.compile(readFileSync(path, 'utf-8'));
    this.compiledTemplates.set(name, compiled);
    return compiled;
  }

  /**
   * Sends an email, logging (not throwing) on failure.
   * @param to - the recipient's email address
   * @param subject - the email subject line
   * @param html - the rendered HTML body
   */
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
