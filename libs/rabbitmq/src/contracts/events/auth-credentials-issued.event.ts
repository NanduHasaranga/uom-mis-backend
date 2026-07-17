export interface AuthCredentialsIssuedEvent {
    userId: string;
    username: string;
    password: string;
    email: string;
    signupLink: string;
    occurredAt: string;
}