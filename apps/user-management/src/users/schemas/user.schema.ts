import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserRole = 'student' | 'staff' | 'admin';
export type AuthStatus = 'pending' | 'active' | 'failed';
export type Gender = 'Male' | 'Female' | 'Other';

@Schema({ _id: false })
export class StudentDetails {
  // format enforced at DTO level: 6 digits + 1 letter, e.g. "200301A"
  @Prop({ required: true, unique: true, sparse: true, match: /^\d{6}[A-Za-z]$/ })
  registrationNo: string;
  @Prop() registrationDate: Date;
  @Prop({ required: true }) degree: string;
  @Prop() faculty: string;
  @Prop({ required: true }) level: string;
  @Prop({ required: true }) department: string;
  @Prop() departmentGroup: string;
  @Prop() specialization: string;
  @Prop({ required: true }) academicYear: string;
  @Prop({ required: true }) administrativeBatch: string;

  // --- admission/UGC fields, present in the real bulk-upload template ---
  @Prop() alIndexNumber: string;
  @Prop() zScore: number;
  @Prop() medium: string;
  @Prop() meritCategory: string;
  @Prop() districtNo: string;
  @Prop() religionNo: string;
  @Prop() ethnicityNo: string;
}
export const StudentDetailsSchema = SchemaFactory.createForClass(StudentDetails);

@Schema({ _id: false })
export class StaffDetails {
  @Prop({ required: true }) departmentDivision: string;
  @Prop() officeExtension: string;
  @Prop({ required: true }) designation: string;
  @Prop() category: string;
}
export const StaffDetailsSchema = SchemaFactory.createForClass(StaffDetails);

@Schema({ timestamps: true, collection: 'users' })
export class User extends Document {
  // optional + sparse: bulk template leaves username blank; Auth Service may assign one
  @Prop({ unique: true, sparse: true, trim: true }) username?: string;
  @Prop({ required: true, enum: ['student', 'staff', 'admin'] }) role: UserRole;

  @Prop({ required: true, enum: ['pending', 'active', 'failed'], default: 'pending' })
  authStatus: AuthStatus;
  @Prop() keycloakUserId: string;
  @Prop() failureReason: string;

  // firstName/lastName are collected on single-entry forms but not in the bulk template
  @Prop() firstName: string;
  @Prop() lastName: string;
  @Prop({ required: true }) nameWithInitials: string;
  @Prop() fullName: string;
  @Prop() title: string;
  @Prop({ required: true }) dateOfBirth: Date;
  @Prop({ required: true, unique: true, sparse: true }) nic: string;
  // optional + sparse: the real bulk-upload template has NO email column for students at all
  @Prop({ unique: true, sparse: true }) primaryEmail?: string;
  @Prop() secondaryEmail: string;
  @Prop({ enum: ['Male', 'Female', 'Other'] }) gender: Gender;

  @Prop() currentAddress: string;
  @Prop() homeTelephoneNo: string;
  @Prop() mobileNo: string;
  @Prop() permanentAddress: string;
  @Prop() telephone: string;

  @Prop({ type: StudentDetailsSchema }) studentDetails?: StudentDetails;
  @Prop({ type: StaffDetailsSchema }) staffDetails?: StaffDetails;

  @Prop({ type: Types.ObjectId, ref: 'BulkUploadBatch' }) batchId?: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true }) createdBy: Types.ObjectId;
  @Prop() loginLinkSentAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ role: 1, authStatus: 1 });
UserSchema.index({ batchId: 1 });
