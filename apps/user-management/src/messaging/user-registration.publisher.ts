import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { RABBITMQ_EXCHANGES, RABBITMQ_ROUTING_KEYS, UserRegistrationRequestedCommand } from '@app/rabbitmq';

@Injectable()
export class UserRegistrationPublisher {
  private readonly logger = new Logger(UserRegistrationPublisher.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  async publish(command: UserRegistrationRequestedCommand): Promise<void> {
    await this.amqpConnection.publish(
      RABBITMQ_EXCHANGES.USER_MGMT_COMMANDS.name,
      RABBITMQ_ROUTING_KEYS.USER_REGISTRATION,
      command,
      { persistent: true },
    );
    this.logger.log(`Published user.registration for user ${command.userId}`);
  }
}
