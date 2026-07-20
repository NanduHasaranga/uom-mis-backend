import { Module } from '@nestjs/common';
import { AuthProvisionController } from './auth-provision.controller';
import { AuthProvisionService } from './auth-provision.service';
import { LdapModule } from '../ldap/ldap.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [LdapModule, PermissionsModule, EventsModule],
  controllers: [AuthProvisionController],
  providers: [AuthProvisionService],
})
export class AuthProvisionModule {}