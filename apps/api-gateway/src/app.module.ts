import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE',
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: 3001 },
      },
      {
        name: 'NOTIFICATION_SERVICE',
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: 3002 },
      },
      {
        name: 'USER_MANAGEMENT_SERVICE',
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: 3003 },
      },
    ])
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
