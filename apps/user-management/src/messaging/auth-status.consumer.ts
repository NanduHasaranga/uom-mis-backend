import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe, MessageHandlerErrorBehavior } from '@golevelup/nestjs-rabbitmq';
import { RABBITMQ_EXCHANGES, RABBITMQ_QUEUES, RABBITMQ_ROUTING_KEYS, type AuthRegistrationStatusEvent } from '@app/rabbitmq';

@Injectable()
export class AuthStatusConsumer {
    private readonly logger = new Logger(AuthStatusConsumer.name);

    @RabbitSubscribe({
        exchange: RABBITMQ_EXCHANGES.AUTH_EVENTS.name,
        routingKey: RABBITMQ_ROUTING_KEYS.AUTH_REGISTRATION_COMPLETED,
        queue: RABBITMQ_QUEUES.USER_MANAGEMENT_AUTH_STATUS.name,
        queueOptions: { durable: true },
        errorBehavior: MessageHandlerErrorBehavior.NACK,
    })
    
    async handleAuthStatus(event: AuthRegistrationStatusEvent): Promise<void> {
        // TODO: persist auth-sync status (event.status) for event.userId once the User schema exists
        this.logger.log(`Received auth status for user ${event.userId}: ${event.status}`);
    }
}