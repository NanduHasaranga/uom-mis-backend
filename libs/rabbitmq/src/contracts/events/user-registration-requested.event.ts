export interface UserRegistrationRequestedCommand {
  correlationId: string;
  userId: string;
  primaryEmail: string;
  userName: string;
  secondaryEmail: string;
  fullName: string;
  role: string;
  registration_No: string;
}
