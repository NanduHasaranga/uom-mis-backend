import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from './config/configuration';
import { HealthController } from './health/health.controller';
import { UsersModule } from './users/users.module';
import { BulkUploadModule } from './bulk-upload/bulk-upload.module';
import { MessagingModule } from './messaging/messaging.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongodbUri'),
      }),
      inject: [ConfigService],
    }),
    MessagingModule,
    UsersModule,
    BulkUploadModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
