import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AuthAccount,
  AuthAccountSchema,
} from './schemas/auth-account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: AuthAccount.name,
        schema: AuthAccountSchema,
      },
    ]),
  ],
  exports: [MongooseModule],
})
export class PermissionsModule {}