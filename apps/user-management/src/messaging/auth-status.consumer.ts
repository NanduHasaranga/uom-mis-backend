import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe, MessageHandlerErrorBehavior } from '@golevelup/nestjs-rabbitmq';
import { RABBITMQ_BINDING_KEYS, RABBITMQ_EXCHANGES, RABBITMQ_QUEUES, type AuthRegistrationStatusEvent } from '@app/rabbitmq';

@Injectable()
export class AuthStatusConsumer {
    private readonly logger = new Logger(AuthStatusConsumer.name);

    @RabbitSubscribe({
        exchange: RABBITMQ_EXCHANGES.AUTH_EVENTS.name,
        routingKey: RABBITMQ_BINDING_KEYS.AUTH_USER_MGMT_RESULT,
        queue: RABBITMQ_QUEUES.USER_MGMT_AUTH_RESULT.name,
        queueOptions: { durable: true },
        errorBehavior: MessageHandlerErrorBehavior.NACK,
    })
    
    async handleAuthStatus(event: AuthRegistrationStatusEvent): Promise<void> {
        // TODO: persist auth-sync status (event.status) for event.userId once the User schema exists
        this.logger.log(`Received auth status for user ${event.userId}: ${event.status}`);
    }
}