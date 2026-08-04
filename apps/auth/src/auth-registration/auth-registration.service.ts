import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { AuthRegistrationStatus } from '@app/rabbitmq';

import { LdapService } from '../ldap/ldap.service';
import { UserRegistrationRequestedDto } from './dto/user-registration-requested.dto';
import {
  AuthAccount,
  AuthAccountDocument,
} from '../permissions/schemas/auth-account.schema';
import { EventPublisherService } from '../events/event-publisher.service';
import { AuditService } from '../audit/audit.service';
import { AuthRequestOutcome } from '../audit/schemas/auth-request-log.schema';

const REGISTRATION_ACTION = 'user.registration';

@Injectable()
export class AuthRegistrationService {
  private readonly logger = new Logger(AuthRegistrationService.name);

  constructor(
    private readonly ldapService: LdapService,
    private readonly eventPublisherService: EventPublisherService,
    private readonly auditService: AuditService,

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

  async registerUser(event: UserRegistrationRequestedDto) {
    this.logger.log({
      message: 'User registration started',
      correlationId: event.correlationId,
      userId: event.userId,
      email: event.primaryEmail,
    });

    const existingAuthAccount = await this.authAccountModel.findOne({
      userId: event.userId,
    });

    if (existingAuthAccount) {
      this.logger.log({
        message: 'User already registered. Skipping duplicate event.',
        correlationId: event.correlationId,
        userId: event.userId,
      });

      await this.auditService.record({
        correlationId: event.correlationId,
        userId: event.userId,
        email: event.primaryEmail,
        action: REGISTRATION_ACTION,
        outcome: AuthRequestOutcome.DUPLICATE,
      });

      await this.eventPublisherService.publishAuthRegistrationStatus({
        correlationId: event.correlationId,
        userId: event.userId,
        status: AuthRegistrationStatus.SUCCESS,
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
        mail: event.primaryEmail,
        employeeId: event.registration_No,
        password: temporaryPassword,
      });

      this.logger.log({
        message: 'Temporary password generated for new user',
        correlationId: event.correlationId,
        userId: event.userId,
      });

      await this.authAccountModel.create({
        userId: event.userId,
        email: event.primaryEmail,
        ldapDn,
        role: event.role,
        status: 'ACTIVE',
      });

      await this.eventPublisherService.publishCredentialsIssued({
        userId: event.userId,
        email: event.primaryEmail,
        fullName: event.fullName,
        role: event.role,
        temporaryPassword,
      });

      await this.eventPublisherService.publishAuthRegistrationStatus({
        correlationId: event.correlationId,
        userId: event.userId,
        status: AuthRegistrationStatus.SUCCESS,
      });

      await this.auditService.record({
        correlationId: event.correlationId,
        userId: event.userId,
        email: event.primaryEmail,
        action: REGISTRATION_ACTION,
        outcome: AuthRequestOutcome.SUCCESS,
      });

      this.logger.log({
        message: 'User registration completed',
        correlationId: event.correlationId,
        userId: event.userId,
        ldapDn,
      });
    } catch (error) {
      await this.auditService.record({
        correlationId: event.correlationId,
        userId: event.userId,
        email: event.primaryEmail,
        action: REGISTRATION_ACTION,
        outcome: AuthRequestOutcome.FAILED,
        reason: error.message,
      });

      await this.eventPublisherService.publishAuthRegistrationStatus({
        correlationId: event.correlationId,
        userId: event.userId,
        status: AuthRegistrationStatus.FAILED,
        reason: error.message,
      });

      throw error;
    }
  }
}
