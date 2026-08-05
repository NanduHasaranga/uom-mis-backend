import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AppService {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('USER_MANAGEMENT_SERVICE') private readonly userManagementClient: ClientProxy,
  ) { }

  getHello(): string {
    return 'Hello World!';
  }

  async login(body: any) {
    return firstValueFrom(this.authClient.send({ cmd: 'login' }, body))
  }

  async createUser(body: any) {
    return firstValueFrom(this.userManagementClient.send({ cmd: 'createUser' }, body));
  }
}
