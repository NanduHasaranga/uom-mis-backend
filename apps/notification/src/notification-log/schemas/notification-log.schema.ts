import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum NotificationType {
  WELCOME_EMAIL = 'WELCOME_EMAIL',
}

export enum NotificationOutcome {
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export type NotificationLogDocument = HydratedDocument<NotificationLog>;

// Append-only log: one document per notification attempt.
@Schema({ timestamps: true })
export class NotificationLog {
  @Prop({ index: true })
  userId?: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true, enum: NotificationOutcome })
  outcome: NotificationOutcome;

  @Prop()
  reason?: string;
}

export const NotificationLogSchema = SchemaFactory.createForClass(NotificationLog);
