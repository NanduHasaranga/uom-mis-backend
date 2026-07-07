import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AppService {
  constructor(
    @Inject('AUTH') private readonly authClient: ClientProxy,
  ) { }

  getHello(): string {
    return 'Hello World!';
  }

  async login(body: any) {
    return firstValueFrom(this.authClient.send({ cmd: 'login' }, body))
  }
}
