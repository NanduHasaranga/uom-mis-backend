import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { UsersModule } from '../users/users.module';
import { AuthResultConsumer } from './auth-result.consumer';
import { UserRegistrationPublisher } from './user-registration.publisher';
import { getRabbitMqExchangesConfig } from '@app/rabbitmq';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => UsersModule),
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('rabbitmq.uri')!,
        exchanges: getRabbitMqExchangesConfig(),
        connectionInitOptions: { wait: true, timeout: 10000 },
        enableControllerDiscovery: true,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthResultConsumer, UserRegistrationPublisher],
  exports: [UserRegistrationPublisher],
})
export class MessagingModule {}
