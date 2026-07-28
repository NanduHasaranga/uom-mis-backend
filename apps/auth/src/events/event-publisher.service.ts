import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  AuthRegistrationStatus,
  AuthRegistrationStatusEvent,
  AuthCredentialsIssuedEvent,
  RABBITMQ_EXCHANGES,
  RABBITMQ_ROUTING_KEYS,
} from '@app/rabbitmq';

@Injectable()
export class EventPublisherService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async publishAuthRegistrationStatus(payload: AuthRegistrationStatusEvent) {
    const routingKey =
      payload.status === AuthRegistrationStatus.SUCCESS
        ? RABBITMQ_ROUTING_KEYS.AUTH_USER_MGMT_SUCCESS
        : RABBITMQ_ROUTING_KEYS.AUTH_USER_MGMT_FAILED;

    await this.amqpConnection.publish(
      RABBITMQ_EXCHANGES.AUTH_EVENTS.name,
      routingKey,
      payload,
      { persistent: true },
    );
  }

  async publishCredentialsIssued(
    payload: Omit<AuthCredentialsIssuedEvent, 'createdAt'>,
  ) {
    const event: AuthCredentialsIssuedEvent = {
      ...payload,
      createdAt: new Date().toISOString(),
    };

    await this.amqpConnection.publish(
      RABBITMQ_EXCHANGES.AUTH_EVENTS.name,
      RABBITMQ_ROUTING_KEYS.AUTH_CREDENTIALS_ISSUED,
      event,
      { persistent: true },
    );
  }
}