import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { getRabbitMqExchangesConfig } from '@app/rabbitmq';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { CredentialsIssuedConsumer } from './messaging/credentials-issued.consumer';
import { MailService } from './mail/mail.service';

@Module({
  imports: [
    RabbitMQModule.forRoot({
      uri: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
      exchanges: getRabbitMqExchangesConfig(),
      connectionInitOptions: { wait: false },
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, CredentialsIssuedConsumer, MailService],
})
export class NotificationModule { }