import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsMongoId, IsOptional, IsString, Min } from 'class-validator';
import type { AuthStatus, UserRole } from '../schemas/user.schema';

export class QueryUsersDto {
  @IsOptional() @IsIn(['student', 'staff', 'admin']) role?: UserRole;
  @IsOptional() @IsEnum(['pending', 'active', 'failed']) authStatus?: AuthStatus;
  @IsOptional() @IsMongoId() batchId?: string;
  @IsOptional() @IsString() search?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;
}
