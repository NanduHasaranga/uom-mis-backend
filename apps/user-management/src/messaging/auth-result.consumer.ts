import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe, MessageHandlerErrorBehavior } from '@golevelup/nestjs-rabbitmq';
import {
  RABBITMQ_EXCHANGES,
  RABBITMQ_QUEUES,
  RABBITMQ_BINDING_KEYS,
  AuthRegistrationStatus,
  type AuthRegistrationStatusEvent,
} from '@app/rabbitmq';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthResultConsumer {
  private readonly logger = new Logger(AuthResultConsumer.name);

  constructor(private readonly usersService: UsersService) {}

  @RabbitSubscribe({
    exchange: RABBITMQ_EXCHANGES.AUTH_EVENTS.name,
    routingKey: RABBITMQ_BINDING_KEYS.AUTH_USER_MGMT_RESULT,
    queue: RABBITMQ_QUEUES.USER_MGMT_AUTH_RESULT.name,
    queueOptions: { durable: true },
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleAuthResult(event: AuthRegistrationStatusEvent): Promise<void> {
    if (event.status === AuthRegistrationStatus.SUCCESS) {
      const user = await this.usersService.finalizeAfterAuthentication(event.userId);
      if (user) this.logger.log(`Finalized user ${event.userId} as active`);
    } else {
      const reason = event.reason ?? 'Unknown failure';
      await this.usersService.recordAuthenticationFailure(event.userId, reason);
      this.logger.log(`Recorded authentication failure for user ${event.userId}: ${reason}`);
    }
  }
}
