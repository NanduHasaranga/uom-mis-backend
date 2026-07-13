import { Controller, Logger } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
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

  @EventPattern('user.provision.requested')
  async handleUserProvisionRequested(
    @Payload() rawPayload: object,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const message = context.getMessage();

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

      channel.nack(message, false, false);
      return;
    }

    try {
      await this.authProvisionService.provisionUser(payload);

      channel.ack(message);
    } catch (error) {
      this.logger.error({
        message: 'Failed to provision user',
        correlationId: payload.correlationId,
        userId: payload.userId,
        error: error.message,
      });

      channel.nack(message, false, false);
    }
  }
}