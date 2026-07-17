import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AuthRegistrationPublisher } from '../messaging/publishers/auth-registration.publisher';
import type { AuthRegistrationRequestedData } from '../messaging/contracts/auth-registration-requested.contract';
import type { UserRegistrationCompletedData } from '../messaging/contracts/user-registration-completed.contract';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';
import type { Gender, UserRole } from './schemas/user.schema';

// Deliberately not reusing the Mongoose StudentDetails/StaffDetails classes here:
// those model the persisted shape (Dates, some required strings); callers (DTOs,
// bulk-upload row parsing) work with looser/string-typed input, converted here.
export interface StudentDetailsInput {
  registrationNo: string;
  registrationDate?: Date;
  degree: string;
  faculty?: string;
  level: string;
  department: string;
  departmentGroup?: string;
  specialization?: string;
  academicYear: string;
  administrativeBatch: string;
  alIndexNumber?: string;
  zScore?: number;
  medium?: string;
  meritCategory?: string;
  districtNo?: string;
  religionNo?: string;
  ethnicityNo?: string;
}

export interface StaffDetailsInput {
  departmentDivision: string;
  officeExtension?: string;
  designation: string;
  category?: string;
}

export interface PendingUserInput {
  role: UserRole;
  username?: string | null;
  firstName?: string;
  lastName?: string;
  nameWithInitials: string;
  fullName?: string;
  title?: string;
  dateOfBirth: Date;
  nic: string;
  primaryEmail?: string | null;
  secondaryEmail?: string;
  gender?: Gender;
  currentAddress?: string;
  homeTelephoneNo?: string;
  mobileNo?: string;
  permanentAddress?: string;
  telephone?: string;
  studentDetails?: StudentDetailsInput;
  staffDetails?: StaffDetailsInput;
  batchId?: Types.ObjectId;
  createdBy: Types.ObjectId;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly authRegistrationPublisher: AuthRegistrationPublisher,
  ) {}

  /**
   * Creates a `pending` user document and publishes auth.registration.requested.
   * Callers decide how to handle a publish failure: single-registration callers
   * let it propagate (surfaces as a failed HTTP response, not a silently
   * orphaned doc); bulk-upload wraps this per-row instead, to avoid aborting
   * the whole batch over one row's publish failure.
   */
  async createPendingUser(input: PendingUserInput): Promise<User> {
    const fullName = input.fullName ?? deriveFullName(input.firstName, input.lastName);

    const user = await this.userModel.create({
      role: input.role,
      username: input.username ?? undefined,
      authStatus: 'pending',
      firstName: input.firstName,
      lastName: input.lastName,
      nameWithInitials: input.nameWithInitials,
      fullName,
      title: input.title,
      dateOfBirth: input.dateOfBirth,
      nic: input.nic,
      primaryEmail: input.primaryEmail ?? undefined,
      secondaryEmail: input.secondaryEmail,
      gender: input.gender,
      currentAddress: input.currentAddress,
      homeTelephoneNo: input.homeTelephoneNo,
      mobileNo: input.mobileNo,
      permanentAddress: input.permanentAddress,
      telephone: input.telephone,
      studentDetails: input.studentDetails,
      staffDetails: input.staffDetails,
      batchId: input.batchId,
      createdBy: input.createdBy,
    });

    const eventData: AuthRegistrationRequestedData = {
      userId: String(user._id),
      role: user.role,
      username: user.username ?? null,
      fullName,
      nameWithInitials: user.nameWithInitials,
      primaryEmail: user.primaryEmail ?? null,
      mobileNo: user.mobileNo ?? null,
      nic: user.nic,
      dateOfBirth: user.dateOfBirth.toISOString(),
    };

    try {
      await this.authRegistrationPublisher.publish(eventData);
    } catch (err) {
      this.logger.error(
        JSON.stringify({
          msg: 'failed to publish auth.registration.requested — user document left in pending state',
          correlationId: String(user._id),
          error: err instanceof Error ? err.message : String(err),
        }),
      );
      throw err;
    }

    return user;
  }

  async applyRegistrationResult(data: UserRegistrationCompletedData): Promise<User> {
    const user = await this.userModel.findById(data.userId);
    if (!user) {
      throw new NotFoundException(`No user found for userId ${data.userId}`);
    }

    if (data.status === 'success') {
      user.authStatus = 'active';
      if (data.keycloakUserId) user.keycloakUserId = data.keycloakUserId;
      if (!user.username && data.assignedUsername) user.username = data.assignedUsername;
    } else {
      user.authStatus = 'failed';
      user.failureReason = data.failureReason ?? 'Unknown failure';
    }

    await user.save();
    return user;
  }

  async findById(id: string): Promise<User> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async list(query: QueryUsersDto): Promise<{ items: User[]; total: number; page: number; limit: number }> {
    const filter: FilterQuery<User> = {};
    if (query.role) filter.role = query.role;
    if (query.authStatus) filter.authStatus = query.authStatus;
    if (query.batchId) filter.batchId = new Types.ObjectId(query.batchId);
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), 'i');
      filter.$or = [
        { fullName: regex },
        { nameWithInitials: regex },
        { primaryEmail: regex },
        { 'studentDetails.registrationNo': regex },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await Promise.all([
      this.userModel
        .find(filter)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.userModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userModel.findByIdAndUpdate(id, dto, { new: true });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }
}

function deriveFullName(firstName?: string, lastName?: string): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
