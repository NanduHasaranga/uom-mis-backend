export enum AuthRegistrationStatus {
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
}

export interface AuthRegistrationStatusEvent {
    correlationId: string;
    userId: string;
    status: AuthRegistrationStatus;
    reason?: string;
}