import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import type { Gender } from '../schemas/user.schema';

// Explicitly excludes username/role/authStatus — those are not editable via PATCH.
export class UpdateUserDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() nameWithInitials?: string;
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() title?: string;

  @IsOptional() @IsEmail() primaryEmail?: string;
  @IsOptional() @IsEmail() secondaryEmail?: string;
  @IsOptional() @IsEnum(['Male', 'Female', 'Other']) gender?: Gender;

  @IsOptional() @IsString() currentAddress?: string;
  @IsOptional() @IsString() homeTelephoneNo?: string;
  @IsOptional() @IsString() mobileNo?: string;
  @IsOptional() @IsString() permanentAddress?: string;
  @IsOptional() @IsString() telephone?: string;
}
