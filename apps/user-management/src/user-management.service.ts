import { Injectable, Logger } from '@nestjs/common';
import { UserCreatedPublisher } from './messaging/user-created.publisher';
import { UserCreatedEvent } from '@app/rabbitmq';
import { randomUUID } from 'crypto';


interface CreateUserDto {
  username: string;
  email: string;
  fullName?: string;
}

@Injectable()
export class UserManagementService {
  private readonly logger = new Logger(UserManagementService.name);
  constructor(private readonly userCreatedPublisher: UserCreatedPublisher) { }

  getHello(): string {
    return 'Hello World!';
  }

  async createUser(dto: CreateUserDto): Promise<{ userId: string }> {
    // TODO: persist user to MongoDB once the User schema exists
    const userId = randomUUID();

    const event: UserCreatedEvent = {
      userId,
      username: dto.username,
      email: dto.email,
      fullName: dto.fullName,
      createdAt: new Date().toISOString(),
    };

    await this.userCreatedPublisher.publish(event);
    this.logger.log(`user creation published by the user mgmt service: user id ${userId}`)
    return { userId };
  }
}
