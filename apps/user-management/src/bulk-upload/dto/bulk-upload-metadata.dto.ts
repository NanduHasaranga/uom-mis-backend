import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class BulkUploadMetadataDto {
  @IsIn(['student', 'staff'])
  role: 'student' | 'staff';

  @IsOptional() @IsString() degree?: string;
  @IsOptional() @IsString() faculty?: string;
  @IsString() @IsNotEmpty() department: string;
  @IsOptional() @IsString() specialization?: string;
  @IsString() @IsNotEmpty() level: string;
  @IsString() @IsNotEmpty() academicYear: string;
  @IsString() @IsNotEmpty() administrativeBatch: string;
  @IsOptional() @IsDateString() registrationDate?: string;
}
