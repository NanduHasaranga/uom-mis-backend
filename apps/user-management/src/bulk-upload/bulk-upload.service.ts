import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UsersService, StudentDetailsInput } from '../users/users.service';
import { User } from '../users/schemas/user.schema';
import type { AuthStatus } from '../users/schemas/user.schema';
import { BulkUploadMetadataDto } from './dto/bulk-upload-metadata.dto';
import { ExcelParserService } from './parsers/excel-parser.service';
import { BulkUploadBatch } from './schemas/bulk-upload-batch.schema';

@Injectable()
export class BulkUploadService {
  private readonly logger = new Logger(BulkUploadService.name);

  constructor(
    @InjectModel(BulkUploadBatch.name) private readonly batchModel: Model<BulkUploadBatch>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly excelParser: ExcelParserService,
    private readonly usersService: UsersService,
  ) {}

  async processUpload(
    file: Express.Multer.File,
    metadata: BulkUploadMetadataDto,
    uploadedBy: Types.ObjectId,
  ): Promise<BulkUploadBatch> {
    if (metadata.role !== 'student') {
      // Parser + column mapping are student-only for now (spec §3: "structured so it can be reused for staff later").
      throw new BadRequestException('Bulk upload currently only supports role=student');
    }

    const { rows, rowErrors, attemptedRowCount } = await this.excelParser.parse(file);

    if (rowErrors.length > 0) {
      return this.batchModel.create({
        fileName: file.originalname,
        uploadedBy,
        role: metadata.role,
        batchMetadata: this.toBatchMetadata(metadata),
        totalRows: attemptedRowCount,
        createdCount: 0,
        failedRowCount: attemptedRowCount,
        rowErrors,
      });
    }

    const batch = await this.batchModel.create({
      fileName: file.originalname,
      uploadedBy,
      role: metadata.role,
      batchMetadata: this.toBatchMetadata(metadata),
      totalRows: attemptedRowCount,
      createdCount: 0,
      failedRowCount: 0,
      rowErrors: [],
    });

    const postCreationErrors: string[] = [];
    let createdCount = 0;

    for (const row of rows) {
      try {
        await this.usersService.createPendingUser({
          role: 'student',
          username: row.username,
          nameWithInitials: row.nameWithInitials,
          fullName: row.fullName,
          title: row.title,
          dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : (undefined as unknown as Date),
          nic: row.nic,
          gender: row.gender,
          homeTelephoneNo: row.homeTelephoneNo,
          mobileNo: row.mobileNo,
          permanentAddress: row.permanentAddress,
          studentDetails: this.mergeStudentDetails(row.studentDetails, metadata),
          batchId: batch._id as Types.ObjectId,
          createdBy: uploadedBy,
        });
        createdCount++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          JSON.stringify({ msg: 'bulk row failed', batchId: String(batch._id), row: row.rowNumber, error: message }),
        );
        postCreationErrors.push(`Row ${row.rowNumber}: ${message}`);
      }
    }

    batch.createdCount = createdCount;
    batch.failedRowCount = attemptedRowCount - createdCount;
    batch.rowErrors = postCreationErrors;
    await batch.save();

    return batch;
  }

  async getBatchStatus(batchId: string) {
    const batch = await this.batchModel.findById(batchId);
    if (!batch) throw new NotFoundException(`Batch ${batchId} not found`);

    const counts = await this.userModel.aggregate<{ _id: AuthStatus; count: number }>([
      { $match: { batchId: batch._id } },
      { $group: { _id: '$authStatus', count: { $sum: 1 } } },
    ]);
    const authStatusCounts: Record<AuthStatus, number> = { pending: 0, active: 0, failed: 0 };
    for (const { _id, count } of counts) authStatusCounts[_id] = count;

    return { batch, authStatusCounts };
  }

  private toBatchMetadata(metadata: BulkUploadMetadataDto) {
    return {
      degree: metadata.degree,
      faculty: metadata.faculty,
      department: metadata.department,
      specialization: metadata.specialization,
      level: metadata.level,
      academicYear: metadata.academicYear,
      administrativeBatch: metadata.administrativeBatch,
      registrationDate: metadata.registrationDate ? new Date(metadata.registrationDate) : undefined,
    };
  }

  private mergeStudentDetails(
    rowDetails: {
      registrationNo: string;
      alIndexNumber?: string;
      zScore?: number;
      medium?: string;
      meritCategory?: string;
      districtNo?: string;
      religionNo?: string;
      ethnicityNo?: string;
    },
    metadata: BulkUploadMetadataDto,
  ): StudentDetailsInput {
    return {
      ...rowDetails,
      degree: metadata.degree ?? '',
      faculty: metadata.faculty,
      level: metadata.level,
      department: metadata.department,
      specialization: metadata.specialization,
      academicYear: metadata.academicYear,
      administrativeBatch: metadata.administrativeBatch,
      registrationDate: metadata.registrationDate ? new Date(metadata.registrationDate) : undefined,
    };
  }
}
