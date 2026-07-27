export interface AuthCredentialsIssuedEvent {
    userId: string;
    email: string;
    fullName: string;
    role: string;
    temporaryPassword: string;
    createdAt: string;
}