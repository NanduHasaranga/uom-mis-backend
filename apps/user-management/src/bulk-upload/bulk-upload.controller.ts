import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { memoryStorage } from 'multer';
import { Request } from 'express';
import { adminIdFromSub } from '../common/utils/admin-id.util';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TokenPayload } from '../common/guards/token-verifier.interface';
import { BulkUploadService } from './bulk-upload.service';
import { BulkUploadMetadataDto } from './dto/bulk-upload-metadata.dto';

type AuthedRequest = Request & { user?: TokenPayload };

@Controller()
export class BulkUploadController {
  constructor(private readonly bulkUploadService: BulkUploadService) {}

  @Post('users/bulk-upload')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('batchMetadata') batchMetadataRaw: string,
    @Req() req: AuthedRequest,
  ) {
    if (!file) throw new BadRequestException('file is required');

    const metadata = await this.parseMetadata(batchMetadataRaw);
    const batch = await this.bulkUploadService.processUpload(
      file,
      metadata,
      adminIdFromSub(req.user!.sub),
    );

    return {
      batchId: String(batch._id),
      totalRows: batch.totalRows,
      createdCount: batch.createdCount,
      failedRowCount: batch.failedRowCount,
      rowErrors: batch.rowErrors,
    };
  }

  @Get('bulk-uploads/:batchId')
  async status(@Param('batchId') batchId: string) {
    return this.bulkUploadService.getBatchStatus(batchId);
  }

  private async parseMetadata(raw: string): Promise<BulkUploadMetadataDto> {
    if (!raw) throw new BadRequestException('batchMetadata is required');

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('batchMetadata must be valid JSON');
    }

    const dto = plainToInstance(BulkUploadMetadataDto, parsed);
    const errors = await validate(dto);
    if (errors.length > 0) {
      throw new BadRequestException(
        errors.flatMap((e) => Object.values(e.constraints ?? {})),
      );
    }
    return dto;
  }
}
