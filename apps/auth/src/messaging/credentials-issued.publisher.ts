import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { RABBITMQ_EXCHANGES, RABBITMQ_ROUTING_KEYS, AuthCredentialsIssuedEvent } from '@app/rabbitmq';

@Injectable()
export class CredentialsIssuedPublisher {
    constructor(private readonly amqpConnection: AmqpConnection) { }

    publish(event: AuthCredentialsIssuedEvent): Promise<boolean> {
        return this.amqpConnection.publish(
            RABBITMQ_EXCHANGES.AUTH_EVENTS.name,
            RABBITMQ_ROUTING_KEYS.AUTH_CREDENTIALS_ISSUED,
            event,
            { persistent: true },
        );
    }
}