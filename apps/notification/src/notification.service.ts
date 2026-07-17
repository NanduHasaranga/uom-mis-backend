import { Injectable, Logger } from '@nestjs/common';
import { AuthCredentialsIssuedEvent } from '@app/rabbitmq';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  getHello(): string {
    return 'Hello World!';
  }

  async sendWelcomeEmail(event: AuthCredentialsIssuedEvent): Promise<void> {
    // TODO: send email via SMTP/provider using event.username/password/email/signupLink
    this.logger.log(`Would send welcome email to ${event.email} for user ${event.username}`);
  }
}