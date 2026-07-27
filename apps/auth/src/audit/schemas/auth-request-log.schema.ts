import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum AuthRequestOutcome {
  SUCCESS = 'SUCCESS',
  DUPLICATE = 'DUPLICATE',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED',
}

export type AuthRequestLogDocument = HydratedDocument<AuthRequestLog>;

// Append-only audit trail: one document per request the auth service handles.
// `timestamps: true` gives each entry a createdAt — the "time" the request was
// processed — and updatedAt (unused, but harmless).
@Schema({ timestamps: true })
export class AuthRequestLog {
  @Prop({ required: true, index: true })
  correlationId: string;

  @Prop({ index: true })
  userId?: string;

  @Prop()
  email?: string;

  // The logical action being audited, e.g. the inbound routing key.
  @Prop({ required: true })
  action: string;

  @Prop({ required: true, enum: AuthRequestOutcome })
  outcome: AuthRequestOutcome;

  @Prop()
  reason?: string;
}

export const AuthRequestLogSchema =
  SchemaFactory.createForClass(AuthRequestLog);
