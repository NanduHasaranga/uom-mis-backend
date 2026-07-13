import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const auth_app = await NestFactory.create(AuthModule);
  const configService = auth_app.get(ConfigService);

  auth_app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  auth_app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [configService.getOrThrow<string>('RABBITMQ_URL')],
      queue: configService.getOrThrow<string>('AUTH_QUEUE'),
      queueOptions: {
        durable: true,
      },
      noAck: false,
    },
  });

  await auth_app.startAllMicroservices();

  await auth_app.listen(configService.getOrThrow<number>('PORT'));
}

bootstrap();

