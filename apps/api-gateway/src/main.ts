import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AuthServiceModule } from 'apps/auth-service/src/auth-service.module';
import { NotificationServiceModule } from 'apps/notification-service/src/notification-service.module';
import { UserManagementModule } from 'apps/user-management/src/user-management.module';

async function bootstrap() {
  // const app = await NestFactory.create(AppModule);
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport:Transport.TCP,
    },
  );
  await app.listen();

  const auth_service =await NestFactory.createMicroservice<MicroserviceOptions>(
    AuthServiceModule,{
      transport:Transport.TCP,
    }
  );
  await auth_service.listen()

  const notification_service = await NestFactory.createMicroservice<MicroserviceOptions>(
    NotificationServiceModule,{
      transport:Transport.TCP
    }
  );
  await notification_service.listen()

  const user_management_service = await NestFactory.createMicroservice<MicroserviceOptions>(
    UserManagementModule,{
      transport:Transport.TCP
    }
  );
  
  await user_management_service.listen()

}
bootstrap();
