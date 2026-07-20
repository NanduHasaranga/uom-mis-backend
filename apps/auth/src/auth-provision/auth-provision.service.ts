import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';

import { LdapService } from '../ldap/ldap.service';
import { UserProvisionRequestedDto } from './dto/user-provision-requested.dto';
import {
  AuthAccount,
  AuthAccountDocument,
} from '../permissions/schemas/auth-account.schema';
import { EventPublisherService } from '../events/event-publisher.service';

@Injectable()
export class AuthProvisionService {
  private readonly logger = new Logger(AuthProvisionService.name);

  constructor(
    private readonly ldapService: LdapService,
    private readonly eventPublisherService: EventPublisherService,

    @InjectModel(AuthAccount.name)
    private readonly authAccountModel: Model<AuthAccountDocument>,
  ) {}

  private generateTemporaryPassword(): string {
    return randomBytes(9).toString('base64url');
  }

  private splitFullName(fullName: string): { givenName: string; sn: string } {
    const [givenName, ...rest] = fullName.trim().split(/\s+/);
    return { givenName, sn: rest.length > 0 ? rest.join(' ') : givenName };
  }

  // TODO: decide the institutional primary-email generation rule (e.g. derived from
  // regNumber/role) and where it's used (LDAP `mail`, AuthAccount, event payload).
  // Currently just passes the event's email through unchanged.
  private generatePrimaryEmail(event: UserProvisionRequestedDto): string {
    return event.email;
  }

  async provisionUser(event: UserProvisionRequestedDto) {
    this.logger.log({
      message: 'User provisioning started',
      correlationId: event.correlationId,
      userId: event.userId,
      email: event.email,
    });

    const existingAuthAccount = await this.authAccountModel.findOne({
      userId: event.userId,
    });

    if (existingAuthAccount) {
      this.logger.log({
        message: 'User already provisioned. Skipping duplicate event.',
        correlationId: event.correlationId,
        userId: event.userId,
      });

      await this.eventPublisherService.publishUserProvisioned({
        correlationId: event.correlationId,
        userId: event.userId,
        email: event.email,
        role: existingAuthAccount.role,
      });

      return;
    }

    try {
      const { givenName, sn } = this.splitFullName(event.fullName);
      const temporaryPassword = this.generateTemporaryPassword();

      const ldapDn = await this.ldapService.createUser({
        uid: event.userId,
        cn: event.fullName,
        givenName,
        sn,
        mail: event.email,
        address: event.address,
        employeeId: event.regNumber,
        password: temporaryPassword,
      });

      this.logger.log({
        message: 'Temporary password generated for new user (LDAP-only, dev use)',
        correlationId: event.correlationId,
        userId: event.userId,
        temporaryPassword,
      });

      await this.authAccountModel.create({
        userId: event.userId,
        email: event.email,
        ldapDn,
        role: event.role,
        status: 'ACTIVE',
      });

      await this.eventPublisherService.publishUserProvisioned({
        correlationId: event.correlationId,
        userId: event.userId,
        email: event.email,
        role: event.role,
      });

      this.logger.log({
        message: 'User provisioning completed',
        correlationId: event.correlationId,
        userId: event.userId,
        ldapDn,
      });
    } catch (error) {
      await this.eventPublisherService.publishUserProvisionFailed({
        correlationId: event.correlationId,
        userId: event.userId,
        email: event.email,
        reason: error.message,
      });

      throw error;
    }
  }
}