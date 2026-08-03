import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { getRabbitMqExchangesConfig } from '@app/rabbitmq';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { CredentialsIssuedConsumer } from './messaging/credentials-issued.consumer';
import { MailService } from './mail/mail.service';
import { NotificationLogModule } from './notification-log/notification-log.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/notification'),
    RabbitMQModule.forRoot({
      uri: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
      exchanges: getRabbitMqExchangesConfig(),
      connectionInitOptions: { wait: false },
    }),
    NotificationLogModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService, CredentialsIssuedConsumer, MailService],
})
export class NotificationModule { }