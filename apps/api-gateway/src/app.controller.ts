import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('auth')
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Post('login')
  login(@Body() body: any) {
    return this.appService.login(body);
  }

  @Post('users')
  createUser(@Body() body: any) {
    return this.appService.createUser(body);
  }
}
