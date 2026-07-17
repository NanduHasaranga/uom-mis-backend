import { Injectable } from '@nestjs/common';
import { RabbitSubscribe, MessageHandlerErrorBehavior } from '@golevelup/nestjs-rabbitmq';
import { RABBITMQ_EXCHANGES, RABBITMQ_QUEUES, RABBITMQ_ROUTING_KEYS,type AuthCredentialsIssuedEvent } from '@app/rabbitmq';
import { NotificationService } from '../notification.service';

@Injectable()
export class CredentialsIssuedConsumer {
    constructor(private readonly notificationService: NotificationService) { }

    @RabbitSubscribe({
        exchange: RABBITMQ_EXCHANGES.AUTH_EVENTS.name,
        routingKey: RABBITMQ_ROUTING_KEYS.AUTH_CREDENTIALS_ISSUED,
        queue: RABBITMQ_QUEUES.NOTIFICATION_CREDENTIALS.name,
        queueOptions: { durable: true },
        errorBehavior: MessageHandlerErrorBehavior.NACK,
    })
    async handleCredentialsIssued(event: AuthCredentialsIssuedEvent): Promise<void> {
        await this.notificationService.sendWelcomeEmail(event);
    }
}