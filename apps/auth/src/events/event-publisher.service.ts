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

  async publishAuthRegistrationStatus(
    payload: Omit<AuthRegistrationStatusEvent, 'occurredAt'>,
  ) {
    const routingKey =
      payload.status === AuthRegistrationStatus.SUCCESS
        ? RABBITMQ_ROUTING_KEYS.AUTH_USER_MGMT_SUCCEEDED
        : RABBITMQ_ROUTING_KEYS.AUTH_USER_MGMT_FAILED;

    const event: AuthRegistrationStatusEvent = {
      ...payload,
      occurredAt: new Date().toISOString(),
    };

    await this.amqpConnection.publish(
      RABBITMQ_EXCHANGES.AUTH_EVENTS.name,
      routingKey,
      event,
      { persistent: true },
    );
  }

  async publishCredentialsIssued(
    payload: Omit<AuthCredentialsIssuedEvent, 'occurredAt'>,
  ) {
    const routingKey =
      payload.status === AuthRegistrationStatus.SUCCESS
        ? RABBITMQ_ROUTING_KEYS.AUTH_NOTIFICATION_SUCCEEDED
        : RABBITMQ_ROUTING_KEYS.AUTH_NOTIFICATION_FAILED;

    const event: AuthCredentialsIssuedEvent = {
      ...payload,
      occurredAt: new Date().toISOString(),
    };

    await this.amqpConnection.publish(
      RABBITMQ_EXCHANGES.AUTH_EVENTS.name,
      routingKey,
      event,
      { persistent: true },
    );
  }
}