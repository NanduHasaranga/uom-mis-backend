import { config as loadDotenv } from 'dotenv';
import { join } from 'path';

// Must precede the NotificationModule import below — NotificationModule calls
// RabbitMQModule.forRoot({ uri: process.env.RABBITMQ_URL, ... }) directly in
// its @Module() decorator, which runs at import time, before anything else here.
loadDotenv({ path: join(process.cwd(), 'apps/notification/.env') });

import { NestFactory } from '@nestjs/core';
import { NotificationModule } from './notification.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const notification_app = await NestFactory.createMicroservice<MicroserviceOptions>(
    NotificationModule, {
    transport: Transport.TCP,
    options: { host: '127.0.0.1', port: 3002 }
  }
  );
  notification_app.enableShutdownHooks();
  await notification_app.listen();
}
bootstrap();