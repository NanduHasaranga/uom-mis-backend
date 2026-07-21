import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { getRabbitMqExchangesConfig } from '@app/rabbitmq';
import { EventPublisherService } from './event-publisher.service';

@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('RABBITMQ_URL'),
        exchanges: getRabbitMqExchangesConfig(),
        connectionInitOptions: { wait: false },
        enableControllerDiscovery: true,
      }),
    }),
  ],
  providers: [EventPublisherService],
  exports: [EventPublisherService, RabbitMQModule],
})
export class EventsModule {}