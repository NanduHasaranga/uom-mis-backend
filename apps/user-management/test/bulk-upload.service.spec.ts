import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BulkUploadService } from '../src/bulk-upload/bulk-upload.service';

describe('BulkUploadService', () => {
  let batchModel: { create: jest.Mock };
  let userModel: { aggregate: jest.Mock };
  let excelParser: { parse: jest.Mock };
  let usersService: { createPendingUser: jest.Mock };
  let service: BulkUploadService;

  const file = { originalname: 'students.xlsx', buffer: Buffer.from(''), mimetype: '' } as Express.Multer.File;
  const metadata = {
    role: 'student' as const,
    department: 'CSE',
    level: 'L1',
    academicYear: '2025/2026',
    administrativeBatch: '2025',
  };

  beforeEach(() => {
    batchModel = { create: jest.fn() };
    userModel = { aggregate: jest.fn() };
    excelParser = { parse: jest.fn() };
    usersService = { createPendingUser: jest.fn() };
    service = new BulkUploadService(
      batchModel as any,
      userModel as any,
      excelParser as any,
      usersService as any,
    );
  });

  it('rejects non-student roles (parser is student-only for now)', async () => {
    await expect(
      service.processUpload(file, { ...metadata, role: 'staff' as any }, new Types.ObjectId()),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects the whole file up front when rowErrors is non-empty, creating no users', async () => {
    excelParser.parse.mockResolvedValue({
      rows: [],
      rowErrors: ['Row 4: missing required value for "NIC"'],
      attemptedRowCount: 3,
    });
    const batchDoc = { _id: new Types.ObjectId() };
    batchModel.create.mockResolvedValue(batchDoc);

    const result = await service.processUpload(file, metadata, new Types.ObjectId());

    expect(result).toBe(batchDoc);
    expect(batchModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ totalRows: 3, createdCount: 0, failedRowCount: 3 }),
    );
    expect(usersService.createPendingUser).not.toHaveBeenCalled();
  });

  it('creates one pending user per valid row and tallies createdCount', async () => {
    excelParser.parse.mockResolvedValue({
      rows: [
        {
          rowNumber: 4,
          username: null,
          nameWithInitials: 'A.B. Perera',
          fullName: 'A B Perera',
          nic: '200301012345',
          permanentAddress: 'Colombo',
          studentDetails: { registrationNo: '200301A' },
        },
      ],
      rowErrors: [],
      attemptedRowCount: 1,
    });
    const batchDoc: any = { _id: new Types.ObjectId(), save: jest.fn().mockResolvedValue(undefined) };
    batchModel.create.mockResolvedValue(batchDoc);
    usersService.createPendingUser.mockResolvedValue({});

    const result = await service.processUpload(file, metadata, new Types.ObjectId());

    expect(usersService.createPendingUser).toHaveBeenCalledTimes(1);
    expect(result.createdCount).toBe(1);
    expect(result.failedRowCount).toBe(0);
    expect(batchDoc.save).toHaveBeenCalled();
  });

  it('does not abort the batch when one row fails to publish — logs it and keeps going', async () => {
    excelParser.parse.mockResolvedValue({
      rows: [
        { rowNumber: 4, username: null, nameWithInitials: 'A', fullName: 'A', nic: '1', permanentAddress: 'x', studentDetails: { registrationNo: '200301A' } },
        { rowNumber: 5, username: null, nameWithInitials: 'B', fullName: 'B', nic: '2', permanentAddress: 'x', studentDetails: { registrationNo: '200302A' } },
      ],
      rowErrors: [],
      attemptedRowCount: 2,
    });
    const batchDoc: any = { _id: new Types.ObjectId(), save: jest.fn().mockResolvedValue(undefined) };
    batchModel.create.mockResolvedValue(batchDoc);
    usersService.createPendingUser
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('broker unreachable'));

    const result = await service.processUpload(file, metadata, new Types.ObjectId());

    expect(result.createdCount).toBe(1);
    expect(result.failedRowCount).toBe(1);
    expect(result.rowErrors[0]).toContain('Row 5');
  });

  it('getBatchStatus throws NotFoundException for an unknown batch', async () => {
    (batchModel as any).findById = jest.fn().mockResolvedValue(null);
    await expect(service.getBatchStatus('missing')).rejects.toThrow(NotFoundException);
  });
});
