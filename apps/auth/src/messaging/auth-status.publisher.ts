import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { AuthRegistrationStatus, RABBITMQ_EXCHANGES, RABBITMQ_ROUTING_KEYS, AuthRegistrationStatusEvent } from '@app/rabbitmq';

@Injectable()
export class AuthStatusPublisher {
    constructor(private readonly amqpConnection: AmqpConnection) { }

    publish(event: AuthRegistrationStatusEvent): Promise<boolean> {
        const routingKey = event.status === AuthRegistrationStatus.SUCCESS
            ? RABBITMQ_ROUTING_KEYS.AUTH_USER_MGMT_SUCCEEDED
            : RABBITMQ_ROUTING_KEYS.AUTH_USER_MGMT_FAILED;

        return this.amqpConnection.publish(
            RABBITMQ_EXCHANGES.AUTH_EVENTS.name,
            routingKey,
            event,
            { persistent: true },
        );
    }
}