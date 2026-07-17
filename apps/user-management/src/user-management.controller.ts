import { Controller, Get } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserManagementService } from './user-management.service';

@Controller()
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) { }

  @Get()
  getHello(): string {
    return this.userManagementService.getHello();
  }

  @MessagePattern({ cmd: 'createUser' })
  createUser(@Payload() dto: { username: string; email: string; fullName?: string }) {
    return this.userManagementService.createUser(dto);
  }
}