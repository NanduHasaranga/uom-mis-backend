import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthRegistrationStatus, AuthCredentialsIssuedEvent, UserCreatedEvent } from '@app/rabbitmq';

interface LdapRegistrationResult {
  status: AuthRegistrationStatus;
  credentials?: AuthCredentialsIssuedEvent;
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
    const temporaryPassword = randomUUID().slice(0, 12);

    return {
      status: AuthRegistrationStatus.SUCCESS,
      credentials: {
        userId: event.userId,
        username: event.username,
        password: temporaryPassword,
        email: event.email,
        signupLink: `https://example.com/signup/${event.userId}`,
        occurredAt: new Date().toISOString(),
      },
    };
  }
}