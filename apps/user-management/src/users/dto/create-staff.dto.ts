import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import type { Gender } from '../schemas/user.schema';

class StaffDetailsDto {
  @IsString() @IsNotEmpty() departmentDivision: string;
  @IsOptional() @IsString() officeExtension?: string;
  @IsString() @IsNotEmpty() designation: string;
  @IsOptional() @IsString() category?: string;
}

// One endpoint handles both staff and admin — `role` picks which.
export class CreateStaffDto {
  @IsIn(['staff', 'admin']) role: 'staff' | 'admin';

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
  @Type(() => StaffDetailsDto)
  staffDetails: StaffDetailsDto;
}
