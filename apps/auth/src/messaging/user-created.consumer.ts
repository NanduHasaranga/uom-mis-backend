import { Injectable } from '@nestjs/common';
import { RabbitSubscribe, MessageHandlerErrorBehavior } from '@golevelup/nestjs-rabbitmq';
import { RABBITMQ_EXCHANGES, RABBITMQ_QUEUES, RABBITMQ_ROUTING_KEYS,type UserCreatedEvent } from '@app/rabbitmq';
import { AuthService } from '../auth.service';
import { AuthStatusPublisher } from './auth-status.publisher';
import { CredentialsIssuedPublisher } from './credentials-issued.publisher';

@Injectable()
export class UserCreatedConsumer {
  constructor(
    private readonly authService: AuthService,
    private readonly authStatusPublisher: AuthStatusPublisher,
    private readonly credentialsIssuedPublisher: CredentialsIssuedPublisher,
  ) {}

  @RabbitSubscribe({
    exchange: RABBITMQ_EXCHANGES.USER_MGMT_COMMANDS.name,
    routingKey: RABBITMQ_ROUTING_KEYS.USER_REGISTER,
    queue: RABBITMQ_QUEUES.AUTH_USER_REGISTER.name,
    queueOptions: { durable: true },
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    const result = await this.authService.registerLdapUser(event);

    await this.authStatusPublisher.publish({
      userId: event.userId,
      status: result.status,
      occurredAt: new Date().toISOString(),
    });

    await this.credentialsIssuedPublisher.publish(result.credentials);
  }
}