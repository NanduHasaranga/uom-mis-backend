import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { AuthRegistrationStatus, RABBITMQ_EXCHANGES, RABBITMQ_ROUTING_KEYS, AuthCredentialsIssuedEvent } from '@app/rabbitmq';

@Injectable()
export class CredentialsIssuedPublisher {
    constructor(private readonly amqpConnection: AmqpConnection) { }

    publish(event: AuthCredentialsIssuedEvent): Promise<boolean> {
        const routingKey = event.status === AuthRegistrationStatus.SUCCESS
            ? RABBITMQ_ROUTING_KEYS.AUTH_NOTIFICATION_SUCCEEDED
            : RABBITMQ_ROUTING_KEYS.AUTH_NOTIFICATION_FAILED;

        return this.amqpConnection.publish(
            RABBITMQ_EXCHANGES.AUTH_EVENTS.name,
            routingKey,
            event,
            { persistent: true },
        );
    }
}