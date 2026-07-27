import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuthAccountDocument = HydratedDocument<AuthAccount>;

@Schema({ timestamps: true })
export class AuthAccount {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  ldapDn: string;

  @Prop({ required: true })
  role: string;

  @Prop({ default: 'ACTIVE' })
  status: 'ACTIVE' | 'DISABLED';
}

export const AuthAccountSchema = SchemaFactory.createForClass(AuthAccount);