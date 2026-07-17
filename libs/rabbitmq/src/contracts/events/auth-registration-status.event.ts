export enum AuthRegistrationStatus {
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
}

export interface AuthRegistrationStatusEvent {
    userId: string;
    status: AuthRegistrationStatus;
    reason?: string;
    occurredAt: string;
}