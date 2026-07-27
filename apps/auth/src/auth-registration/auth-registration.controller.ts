import { Controller, Logger } from '@nestjs/common';
import {
  RabbitSubscribe,
  MessageHandlerErrorBehavior,
} from '@golevelup/nestjs-rabbitmq';
import {
  AuthRegistrationStatus,
  RABBITMQ_EXCHANGES,
  RABBITMQ_QUEUES,
  RABBITMQ_ROUTING_KEYS,
} from '@app/rabbitmq';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthRegistrationService } from './auth-registration.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { UserRegistrationRequestedDto } from './dto/user-registration-requested.dto';
import { AuditService } from '../audit/audit.service';
import { AuthRequestOutcome } from '../audit/schemas/auth-request-log.schema';

@Controller()
export class AuthRegistrationController {
  private readonly logger = new Logger(AuthRegistrationController.name);

  constructor(
    private readonly authRegistrationService: AuthRegistrationService,
    private readonly eventPublisherService: EventPublisherService,
    private readonly auditService: AuditService,
  ) {}

  @RabbitSubscribe({
    exchange: RABBITMQ_EXCHANGES.USER_MANAGEMENT_EVENTS.name,
    routingKey: RABBITMQ_ROUTING_KEYS.USER_REGISTRATION_REQUESTED,
    queue: RABBITMQ_QUEUES.AUTH_USER_REGISTRATION_REQUESTED.name,
    queueOptions: { durable: true },
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleUserRegistrationRequested(rawPayload: object) {
    const payload = plainToInstance(UserRegistrationRequestedDto, rawPayload, {
      excludeExtraneousValues: false,
    });

    const validationErrors = await validate(payload, { whitelist: true });
    console.log("message:", payload);

    if (validationErrors.length > 0) {
      const reason = validationErrors
        .flatMap((error) => Object.values(error.constraints ?? {}))
        .join('; ');

      this.logger.error({
        message: 'Rejected invalid user.registration payload',
        correlationId: payload.correlationId,
        userId: payload.userId,
        reason,
      });

      await this.auditService.record({
        correlationId: payload.correlationId,
        userId: payload.userId,
        email: payload.primaryEmail,
        action: RABBITMQ_ROUTING_KEYS.USER_REGISTRATION_REQUESTED,
        outcome: AuthRequestOutcome.REJECTED,
        reason,
      });

      await this.eventPublisherService.publishAuthRegistrationStatus({
        correlationId: payload.correlationId,
        userId: payload.userId,
        status: AuthRegistrationStatus.FAILED,
        reason,
      });

      throw new Error(reason);
    }

    try {
      await this.authRegistrationService.registerUser(payload);
    } catch (error) {
      this.logger.error({
        message: 'Failed to register user',
        correlationId: payload.correlationId,
        userId: payload.userId,
        error: error.message,
      });

      throw error;
    }
  }
}
