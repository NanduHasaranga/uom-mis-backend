import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { adminIdFromSub } from '../common/utils/admin-id.util';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { TokenPayload } from '../common/guards/token-verifier.interface';
import { CreateStaffDto } from './dto/create-staff.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

type AuthedRequest = Request & { user?: TokenPayload };

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('students')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.ACCEPTED)
  async registerStudent(@Body() dto: CreateStudentDto, @Req() req: AuthedRequest) {
    const user = await this.usersService.createPendingUser({
      role: 'student',
      firstName: dto.firstName,
      lastName: dto.lastName,
      nameWithInitials: dto.nameWithInitials,
      fullName: dto.fullName,
      title: dto.title,
      dateOfBirth: new Date(dto.dateOfBirth),
      nic: dto.nic,
      primaryEmail: dto.primaryEmail,
      secondaryEmail: dto.secondaryEmail,
      gender: dto.gender,
      currentAddress: dto.currentAddress,
      homeTelephoneNo: dto.homeTelephoneNo,
      mobileNo: dto.mobileNo,
      permanentAddress: dto.permanentAddress,
      telephone: dto.telephone,
      studentDetails: {
        ...dto.studentDetails,
        registrationDate: dto.studentDetails.registrationDate
          ? new Date(dto.studentDetails.registrationDate)
          : undefined,
      },
      createdBy: adminIdFromSub(req.user!.sub),
    });
    return { userId: String(user._id) };
  }

  @Post('staff')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.ACCEPTED)
  async registerStaff(@Body() dto: CreateStaffDto, @Req() req: AuthedRequest) {
    const user = await this.usersService.createPendingUser({
      role: dto.role,
      firstName: dto.firstName,
      lastName: dto.lastName,
      nameWithInitials: dto.nameWithInitials,
      title: dto.title,
      dateOfBirth: new Date(dto.dateOfBirth),
      nic: dto.nic,
      primaryEmail: dto.primaryEmail,
      secondaryEmail: dto.secondaryEmail,
      gender: dto.gender,
      currentAddress: dto.currentAddress,
      homeTelephoneNo: dto.homeTelephoneNo,
      mobileNo: dto.mobileNo,
      permanentAddress: dto.permanentAddress,
      telephone: dto.telephone,
      staffDetails: dto.staffDetails,
      createdBy: adminIdFromSub(req.user!.sub),
    });
    return { userId: String(user._id) };
  }

  @Get()
  async list(@Query() query: QueryUsersDto) {
    return this.usersService.list(query);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.usersService.findByUserId(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }
}
