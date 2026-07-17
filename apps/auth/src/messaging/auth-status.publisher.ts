import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { RABBITMQ_EXCHANGES, RABBITMQ_ROUTING_KEYS, AuthRegistrationStatusEvent } from '@app/rabbitmq';

@Injectable()
export class AuthStatusPublisher {
    constructor(private readonly amqpConnection: AmqpConnection) { }

    publish(event: AuthRegistrationStatusEvent): Promise<boolean> {
        return this.amqpConnection.publish(
            RABBITMQ_EXCHANGES.AUTH_EVENTS.name,
            RABBITMQ_ROUTING_KEYS.AUTH_REGISTRATION_COMPLETED,
            event,
            { persistent: true },
        );
    }
}