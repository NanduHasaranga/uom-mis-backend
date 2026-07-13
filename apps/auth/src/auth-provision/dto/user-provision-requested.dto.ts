import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UserProvisionRequestedDto {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  correlationId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsOptional()
  @IsString()
  address?: string;

  @ValidateIf((dto: UserProvisionRequestedDto) => dto.role === 'student')
  @IsNotEmpty({ message: 'regNumber is required for students' })
  @IsString()
  regNumber?: string;
}