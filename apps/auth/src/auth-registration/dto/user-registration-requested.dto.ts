import {
  IsEmail,
  IsNotEmpty,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UserRegistrationRequestedDto {
  @IsString()
  @IsNotEmpty()
  correlationId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEmail()
  primaryEmail: string;

  @IsEmail()
  secondaryEmail: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @ValidateIf((dto: UserRegistrationRequestedDto) => dto.role === 'student')
  @IsNotEmpty({ message: 'registration_No is required for students' })
  @IsString()
  registration_No?: string;
}
