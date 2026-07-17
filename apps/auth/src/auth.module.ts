import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { getRabbitMqExchangesConfig } from '@app/rabbitmq';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserCreatedConsumer } from './messaging/user-created.consumer';
import { AuthStatusPublisher } from './messaging/auth-status.publisher';
import { CredentialsIssuedPublisher } from './messaging/credentials-issued.publisher';

@Module({
  imports: [
    RabbitMQModule.forRoot({
      uri: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
      exchanges: getRabbitMqExchangesConfig(),
      connectionInitOptions: { wait: false },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserCreatedConsumer, AuthStatusPublisher, CredentialsIssuedPublisher],
})
export class AuthModule { }