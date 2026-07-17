import { NestFactory } from '@nestjs/core';
import { UserManagementModule } from './user-management.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const user_management_app = await NestFactory.createMicroservice<MicroserviceOptions>(
    UserManagementModule,
    {
      transport:Transport.TCP,
      options:{host:'127.0.0.1',port:3003}
    }
  );
  // Gracefully close connections (DB, RabbitMQ, etc.) on process termination signals (SIGTERM/SIGINT)
  user_management_app.enableShutdownHooks();
  await user_management_app.listen();
}
bootstrap();
