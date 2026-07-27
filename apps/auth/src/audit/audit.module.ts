import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditService } from './audit.service';
import {
  AuthRequestLog,
  AuthRequestLogSchema,
} from './schemas/auth-request-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuthRequestLog.name, schema: AuthRequestLogSchema },
    ]),
  ],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
