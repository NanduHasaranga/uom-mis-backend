import { Module } from '@nestjs/common';
import { AuthProvisionController } from './auth-provision.controller';
import { AuthProvisionService } from './auth-provision.service';
import { KeycloakModule } from '../keycloak/keycloak.module';
import { LdapModule } from '../ldap/ldap.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [KeycloakModule, LdapModule, PermissionsModule, EventsModule],
  controllers: [AuthProvisionController],
  providers: [AuthProvisionService],
})
export class AuthProvisionModule {}