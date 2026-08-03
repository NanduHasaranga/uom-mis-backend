import { Injectable, Logger } from '@nestjs/common';
import { AuthRegistrationStatus, AuthCredentialsIssuedEvent } from '@app/rabbitmq';
import { MailService } from './mail/mail.service';
import { buildWelcomeEmailHtml } from './mail/templates/welcome-email.template';
import { NotificationLogService } from './notification-log/notification-log.service';
import { NotificationOutcome, NotificationType } from './notification-log/schemas/notification-log.schema';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly notificationLogService: NotificationLogService,
  ) { }

  getHello(): string {
    return 'Hello World!';
  }

  async sendWelcomeEmail(event: AuthCredentialsIssuedEvent): Promise<void> {
    if (event.status !== AuthRegistrationStatus.SUCCESS) {
      // TODO: send an admin failure report instead, once this path is reachable
      this.logger.warn(`Registration failed for user ${event.username} (${event.userId}) — no welcome email sent`);
      return;
    }

    const subject = 'Welcome to UoM LMS';

    try {
      await this.mailService.send(
        event.email,
        subject,
        buildWelcomeEmailHtml({ username: event.username, password: event.password ?? '' }),
      );

      await this.notificationLogService.record({
        userId: event.userId,
        status: event.status,
        username: event.username,
        email: event.email,
        fullName: event.fullName,
        role: event.role,
        occurredAt: event.occurredAt,
        type: NotificationType.WELCOME_EMAIL,
        subject,
        outcome: NotificationOutcome.SENT,
      });
    } catch (error) {
      await this.notificationLogService.record({
        userId: event.userId,
        status: event.status,
        username: event.username,
        email: event.email,
        fullName: event.fullName,
        role: event.role,
        occurredAt: event.occurredAt,
        type: NotificationType.WELCOME_EMAIL,
        subject,
        outcome: NotificationOutcome.FAILED,
        reason: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}