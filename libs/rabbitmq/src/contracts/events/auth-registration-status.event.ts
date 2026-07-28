export enum AuthRegistrationStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

// One shape for both authentication.success and authentication.failed — the
// routing key tells us which queue-binding delivered it, status tells us
// which branch to take. reason is only populated on failure.
export interface AuthRegistrationStatusEvent {
  correlationId: string;
  userId: string;
  status: AuthRegistrationStatus;
  reason?: string;
  occurredAt: string;
}
