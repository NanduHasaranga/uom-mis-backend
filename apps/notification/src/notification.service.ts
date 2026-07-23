import { Injectable, Logger } from '@nestjs/common';
import { AuthRegistrationStatus, AuthCredentialsIssuedEvent } from '@app/rabbitmq';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  getHello(): string {
    return 'Hello World!';
  }

  async sendWelcomeEmail(event: AuthCredentialsIssuedEvent): Promise<void> {
    if (event.status !== AuthRegistrationStatus.SUCCESS) {
      // TODO: send an admin failure report instead, once this path is reachable
      this.logger.warn(`Registration failed for user ${event.username} (${event.userId}) — no welcome email sent`);
      return;
    }
    // TODO: send email via SMTP/provider using event.username/password/email/signupLink
    this.logger.log(`Would send welcome email to ${event.email} for user ${event.username}`);
  }
}