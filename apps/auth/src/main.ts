import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
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

  await auth_app.listen(configService.getOrThrow<number>('PORT'));
}

bootstrap();

