import { Module } from '@nestjs/common';
import { UserManagementController } from './user-management.controller';
import { UserManagementService } from './user-management.service';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { getRabbitMqExchangesConfig } from '@app/rabbitmq';
import { UserCreatedPublisher } from './messaging/user-created.publisher';
import { AuthStatusConsumer } from './messaging/auth-status.consumer';

@Module({
  imports: [
    RabbitMQModule.forRoot({
      uri: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
      exchanges: getRabbitMqExchangesConfig(),
      connectionInitOptions: { wait: false },
    })
  ],
  controllers: [UserManagementController],
  providers: [UserManagementService, UserCreatedPublisher, AuthStatusConsumer],
})
export class UserManagementModule { }
