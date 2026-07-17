import { NestFactory } from '@nestjs/core';
import { NotificationModule } from './notification.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const notification_app = await NestFactory.createMicroservice<MicroserviceOptions>(
    NotificationModule,{
      transport:Transport.TCP,
      options:{host:'127.0.0.1',port:3002}
    }
  );
  notification_app.enableShutdownHooks();
  await notification_app.listen();
}
bootstrap();