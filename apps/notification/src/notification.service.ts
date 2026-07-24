import { Injectable, Logger } from '@nestjs/common';
import { AuthRegistrationStatus, AuthCredentialsIssuedEvent } from '@app/rabbitmq';
import { MailService } from './mail/mail.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly mailService: MailService) { }

  getHello(): string {
    return 'Hello World!';
  }

  async sendWelcomeEmail(event: AuthCredentialsIssuedEvent): Promise<void> {
    if (event.status !== AuthRegistrationStatus.SUCCESS) {
      // TODO: send an admin failure report instead, once this path is reachable
      this.logger.warn(`Registration failed for user ${event.username} (${event.userId}) — no welcome email sent`);
      return;
    }

    await this.mailService.send(
      event.email,
      'Welcome to UoM LMS',
      `<p>Hi ${event.username},</p>
       <p>Your account is ready. Username: <b>${event.username}</b>, temporary password: <b>${event.password}</b>.</p>
       <p>Complete your signup here: <a href="${event.signupLink}">${event.signupLink}</a></p>`,
    );
  }
}