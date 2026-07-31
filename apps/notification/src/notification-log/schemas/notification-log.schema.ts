import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AuthRegistrationStatus } from '@app/rabbitmq';

export enum NotificationType {
  WELCOME_EMAIL = 'WELCOME_EMAIL',
}

export enum NotificationOutcome {
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export type NotificationLogDocument = HydratedDocument<NotificationLog>;

// Append-only log: one document per notification attempt. Mirrors the
// AuthCredentialsIssuedEvent fields we received — deliberately excluding
// password/signupLink, which must never be persisted.
@Schema({ timestamps: true })
export class NotificationLog {
  @Prop({ required: true, index: true })
  userId: string;

  // type: String set explicitly — AuthRegistrationStatus is defined in a
  // separate project (@app/rabbitmq), so Mongoose can't reflect its type
  // automatically the way it can for enums declared in this same file.
  @Prop({ required: true, type: String, enum: AuthRegistrationStatus })
  status: AuthRegistrationStatus;

  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  role: string;

  // When Auth Service issued the credentials — distinct from this document's
  // own createdAt (when Notification Service processed/sent it).
  @Prop({ required: true })
  occurredAt: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true, enum: NotificationOutcome })
  outcome: NotificationOutcome;

  @Prop()
  reason?: string;
}

export const NotificationLogSchema = SchemaFactory.createForClass(NotificationLog);
