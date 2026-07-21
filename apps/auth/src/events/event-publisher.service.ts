import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { RABBITMQ_EXCHANGES, RABBITMQ_ROUTING_KEYS } from '@app/rabbitmq';
import { randomUUID } from 'crypto';

@Injectable()
export class EventPublisherService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async publishUserProvisioned(payload: {
    correlationId: string;
    userId: string;
    email: string;
    role: string;
  }) {
    await this.amqpConnection.publish(
      RABBITMQ_EXCHANGES.AUTH_EVENTS.name,
      RABBITMQ_ROUTING_KEYS.USER_PROVISIONED,
      {
        eventId: randomUUID(),
        eventType: 'UserProvisioned',
        ...payload,
        publishedAt: new Date().toISOString(),
      },
      { persistent: true },
    );
  }

  async publishUserProvisionFailed(payload: {
    correlationId: string;
    userId: string;
    email: string;
    reason: string;
  }) {
    await this.amqpConnection.publish(
      RABBITMQ_EXCHANGES.AUTH_EVENTS.name,
      RABBITMQ_ROUTING_KEYS.USER_PROVISION_FAILED,
      {
        eventId: randomUUID(),
        eventType: 'UserProvisionFailed',
        ...payload,
        publishedAt: new Date().toISOString(),
      },
      { persistent: true },
    );
  }
}