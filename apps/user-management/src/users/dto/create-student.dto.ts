import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import type { Gender } from '../schemas/user.schema';

class StudentDetailsDto {
  @IsString()
  @Matches(/^\d{6}[A-Za-z]$/, { message: 'registrationNo must be 6 digits followed by 1 letter' })
  registrationNo: string;

  @IsOptional() @IsDateString() registrationDate?: string;
  @IsString() @IsNotEmpty() degree: string;
  @IsOptional() @IsString() faculty?: string;
  @IsString() @IsNotEmpty() level: string;
  @IsString() @IsNotEmpty() department: string;
  @IsOptional() @IsString() departmentGroup?: string;
  @IsOptional() @IsString() specialization?: string;
  @IsString() @IsNotEmpty() academicYear: string;
  @IsString() @IsNotEmpty() administrativeBatch: string;

  @IsOptional() @IsString() alIndexNumber?: string;
  @IsOptional() @IsNumber() zScore?: number;
  @IsOptional() @IsString() medium?: string;
  @IsOptional() @IsString() meritCategory?: string;
  @IsOptional() @IsString() districtNo?: string;
  @IsOptional() @IsString() religionNo?: string;
  @IsOptional() @IsString() ethnicityNo?: string;
}

export class CreateStudentDto {
  @IsString() @IsNotEmpty() nameWithInitials: string;
  @IsString() @IsNotEmpty() fullName: string;
  @IsOptional() @IsString() title?: string;

  @IsDateString() dateOfBirth: string;
  @IsString() @IsNotEmpty() nic: string;
  @IsEmail() primaryEmail: string;
  @IsOptional() @IsEmail() secondaryEmail?: string;
  @IsOptional() @IsEnum(['Male', 'Female', 'Other']) gender?: Gender;

  @IsOptional() @IsString() currentAddress?: string;
  @IsOptional() @IsString() homeTelephoneNo?: string;
  @IsOptional() @IsString() mobileNo?: string;
  @IsOptional() @IsString() permanentAddress?: string;
  @IsOptional() @IsString() telephone?: string;

  @ValidateNested()
  @Type(() => StudentDetailsDto)
  studentDetails: StudentDetailsDto;
}
