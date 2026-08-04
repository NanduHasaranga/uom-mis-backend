import { AuthRegistrationStatus } from './auth-registration-status.event';

export interface AuthCredentialsIssuedEvent {
    userId: string;
    status: AuthRegistrationStatus;
    username: string;
    email: string;
    // password/signupLink only exist when status is SUCCESS
    password?: string;
    // signupLink?: string;
    occurredAt: string;
    role: string;
    // fullName: string;
}