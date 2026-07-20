import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthProvisionModule } from './auth-provision/auth-provision.module';
import { PermissionsModule } from './permissions/permissions.module';
import { EventsModule } from './events/events.module';
import { envValidationSchema } from './config/env.validation';

import { HealthController } from './health-check.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/auth/.env',
      validationSchema: envValidationSchema,
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGO_URI'),
      }),
    }),

    PermissionsModule,
    EventsModule,
    AuthProvisionModule,
  ],
  controllers: [HealthController],
})
export class AuthModule {}