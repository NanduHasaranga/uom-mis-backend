import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { RABBITMQ_EXCHANGES, RABBITMQ_ROUTING_KEYS, UserCreatedEvent } from '@app/rabbitmq';

@Injectable()
export class UserCreatedPublisher {
    constructor(private readonly amqpConnection: AmqpConnection) { }

    publish(event: UserCreatedEvent): Promise<Boolean> {
        return this.amqpConnection.publish(
            RABBITMQ_EXCHANGES.USER_MGMT_COMMANDS.name,
            RABBITMQ_ROUTING_KEYS.USER_REGISTER,
            event,
            { persistent: true },
        );
    }
}