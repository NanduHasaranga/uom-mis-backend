import { Injectable } from '@nestjs/common';
import { RabbitSubscribe, MessageHandlerErrorBehavior } from '@golevelup/nestjs-rabbitmq';
import { RABBITMQ_BINDING_KEYS, RABBITMQ_EXCHANGES, RABBITMQ_QUEUES, type AuthCredentialsIssuedEvent } from '@app/rabbitmq';
import { NotificationService } from '../notification.service';

@Injectable()
export class CredentialsIssuedConsumer {
    constructor(private readonly notificationService: NotificationService) { }

    @RabbitSubscribe({
        exchange: RABBITMQ_EXCHANGES.AUTH_EVENTS.name,
        routingKey: RABBITMQ_BINDING_KEYS.AUTH_NOTIFICATION_RESULT,
        queue: RABBITMQ_QUEUES.NOTIFICATION_AUTH_RESULT.name,
        queueOptions: { durable: true },
        errorBehavior: MessageHandlerErrorBehavior.NACK,
    })
    async handleCredentialsIssued(event: AuthCredentialsIssuedEvent): Promise<void> {
        await this.notificationService.sendWelcomeEmail(event);
    }
}