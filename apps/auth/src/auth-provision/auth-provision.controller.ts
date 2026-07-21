import { Controller, Logger } from '@nestjs/common';
import {
  RabbitSubscribe,
  MessageHandlerErrorBehavior,
} from '@golevelup/nestjs-rabbitmq';
import { RABBITMQ_EXCHANGES, RABBITMQ_QUEUES, RABBITMQ_ROUTING_KEYS } from '@app/rabbitmq';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthProvisionService } from './auth-provision.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { UserProvisionRequestedDto } from './dto/user-provision-requested.dto';

@Controller()
export class AuthProvisionController {
  private readonly logger = new Logger(AuthProvisionController.name);

  constructor(
    private readonly authProvisionService: AuthProvisionService,
    private readonly eventPublisherService: EventPublisherService,
  ) {}

  @RabbitSubscribe({
    exchange: RABBITMQ_EXCHANGES.USER_MANAGEMENT_EVENTS.name,
    routingKey: RABBITMQ_ROUTING_KEYS.USER_PROVISION_REQUESTED,
    queue: RABBITMQ_QUEUES.AUTH_USER_PROVISION_REQUESTED.name,
    queueOptions: { durable: true },
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleUserProvisionRequested(rawPayload: object) {
    const payload = plainToInstance(UserProvisionRequestedDto, rawPayload, {
      excludeExtraneousValues: false,
    });

    const validationErrors = await validate(payload, { whitelist: true });

    if (validationErrors.length > 0) {
      const reason = validationErrors
        .flatMap((error) => Object.values(error.constraints ?? {}))
        .join('; ');

      this.logger.error({
        message: 'Rejected invalid user.provision.requested payload',
        correlationId: payload.correlationId,
        userId: payload.userId,
        reason,
      });

      await this.eventPublisherService.publishUserProvisionFailed({
        correlationId: payload.correlationId,
        userId: payload.userId,
        email: payload.email,
        reason,
      });

      throw new Error(reason);
    }

    try {
      await this.authProvisionService.provisionUser(payload);
    } catch (error) {
      this.logger.error({
        message: 'Failed to provision user',
        correlationId: payload.correlationId,
        userId: payload.userId,
        error: error.message,
      });

      throw error;
    }
  }
}