import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthRegistrationStatus, AuthCredentialsIssuedEvent, UserCreatedEvent } from '@app/rabbitmq';

interface LdapRegistrationResult {
  status: AuthRegistrationStatus;
  credentials: AuthCredentialsIssuedEvent;
}

@Injectable()
export class AuthService {
  getHello(): string {
    return 'Hello World!';
  }

  async registerLdapUser(event: UserCreatedEvent): Promise<LdapRegistrationResult> {
    // TODO: bind to LDAP and create the actual directory entry
    // TODO: generate a strong random password per the org's password policy
    // TODO: build the real signup link (needs a configured base URL)
    const status = AuthRegistrationStatus.SUCCESS;
    const temporaryPassword = randomUUID().slice(0, 12);

    return {
      status,
      credentials: {
        userId: event.userId,
        status,
        username: event.username,
        email: event.email,
        password: status === AuthRegistrationStatus.SUCCESS ? temporaryPassword : undefined,
        signupLink: status === AuthRegistrationStatus.SUCCESS ? `https://example.com/signup/${event.userId}` : undefined,
        occurredAt: new Date().toISOString(),
      },
    };
  }
}