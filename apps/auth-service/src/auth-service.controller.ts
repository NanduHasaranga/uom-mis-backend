import { Controller, Get } from '@nestjs/common';
import { AuthServiceService } from './auth-service.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class AuthServiceController {
  constructor(private readonly authServiceService: AuthServiceService) { }

  @Get()
  getHello(): string {
    return this.authServiceService.getHello();
  }
  @MessagePattern({ cmd: 'login' })
  login(@Payload() data: any) {
    return {
      message: "Login handled by auth service",
      data
    };
  }
}
