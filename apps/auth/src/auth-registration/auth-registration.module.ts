import { Module } from '@nestjs/common';
import { AuthRegistrationController } from './auth-registration.controller';
import { AuthRegistrationService } from './auth-registration.service';
import { LdapModule } from '../ldap/ldap.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { EventsModule } from '../events/events.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [LdapModule, PermissionsModule, EventsModule, AuditModule],
  controllers: [AuthRegistrationController],
  providers: [AuthRegistrationService],
})
export class AuthRegistrationModule {}
