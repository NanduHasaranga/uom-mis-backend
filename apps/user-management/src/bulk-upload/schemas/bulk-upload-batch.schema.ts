import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface BatchMetadata {
  degree?: string;
  faculty?: string;
  department?: string;
  specialization?: string;
  level?: string;
  academicYear?: string;
  administrativeBatch?: string;
  registrationDate?: Date;
}

@Schema({ timestamps: true, collection: 'bulkUploadBatches' })
export class BulkUploadBatch extends Document {
  @Prop({ required: true }) fileName: string;
  @Prop({ required: true, type: Types.ObjectId }) uploadedBy: Types.ObjectId;
  @Prop({ required: true, enum: ['student', 'staff'] }) role: 'student' | 'staff';

  // batch-level defaults applied to every row (from the "Batch Student Registration" form)
  @Prop({ type: Object }) batchMetadata: BatchMetadata;

  @Prop({ default: 0 }) totalRows: number;
  @Prop({ default: 0 }) createdCount: number;
  @Prop({ default: 0 }) failedRowCount: number;
  @Prop({ type: [String], default: [] }) rowErrors: string[];
}

export const BulkUploadBatchSchema = SchemaFactory.createForClass(BulkUploadBatch);
