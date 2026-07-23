import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from '../common/common.module';
import { UsersModule } from '../users/users.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { BulkUploadController } from './bulk-upload.controller';
import { BulkUploadService } from './bulk-upload.service';
import { ExcelParserService } from './parsers/excel-parser.service';
import { BulkUploadBatch, BulkUploadBatchSchema } from './schemas/bulk-upload-batch.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BulkUploadBatch.name, schema: BulkUploadBatchSchema },
      { name: User.name, schema: UserSchema },
    ]),
    UsersModule,
    CommonModule,
  ],
  controllers: [BulkUploadController],
  providers: [BulkUploadService, ExcelParserService],
})
export class BulkUploadModule {}
