import { Injectable } from '@nestjs/common';

@Injectable()
export class UserManagementService {
  getHello(): string {
    return 'Hello World!';
  }
}
