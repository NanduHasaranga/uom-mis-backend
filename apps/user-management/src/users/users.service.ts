import { randomUUID } from 'crypto';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, Types } from 'mongoose';
import { UserRegistrationPublisher } from '../messaging/user-registration.publisher';
import type { UserRegistrationRequestedCommand } from '@app/rabbitmq';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';
import type { Gender, UserRole } from './schemas/user.schema';
import { generateSecondaryEmail, generateUsername } from './utils/owned-fields.util';

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
    private readonly userRegistrationPublisher: UserRegistrationPublisher,
  ) {}

  /**
   * Creates a `pending` user document and publishes user.register on
   * user-mgmt.commands — the trigger that tells Auth Service to create
   * credentials for this user. userId/secondaryEmail (fields User Management
   * owns, never Auth Service) are generated up front here and included in
   * that message, so Auth Service has everything it needs immediately — no
   * reply is sent back after auth.user-mgmt.succeeded/.failed, see
   * finalizeAfterAuthentication below. Callers decide how to handle a publish
   * failure: single-registration callers let it propagate (surfaces as a
   * failed HTTP response, not a silently orphaned doc); bulk-upload wraps
   * this per-row instead, to avoid aborting the whole batch over one row's
   * publish failure.
   */
  async createPendingUser(input: PendingUserInput): Promise<User> {
    const fullName = input.fullName ?? deriveFullName(input.firstName, input.lastName);
    const userId = randomUUID();
    const secondaryEmail = input.secondaryEmail ?? generateSecondaryEmail(userId);
    // Only students carry a batch number, so only students get an auto-generated
    // username here — staff usernames are unset until that policy exists.
    const username =
      input.username ??
      (input.studentDetails?.administrativeBatch
        ? generateUsername(fullName, input.studentDetails.administrativeBatch)
        : undefined);

    const user = await this.userModel.create({
      userId,
      role: input.role,
      username,
      authStatus: 'pending',
      firstName: input.firstName,
      lastName: input.lastName,
      nameWithInitials: input.nameWithInitials,
      fullName,
      title: input.title,
      dateOfBirth: input.dateOfBirth,
      nic: input.nic,
      primaryEmail: input.primaryEmail ?? undefined,
      secondaryEmail,
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

    // primaryEmail/username are '' when we don't actually have one (e.g. a
    // bulk-uploaded student with no email column, or a username Auth Service
    // hasn't assigned yet) — Auth Service's contract types these as required
    // strings, not nullable, so there's no `null` to send instead. Same for
    // registration_No: only students have a registration number at all.
    const command: UserRegistrationRequestedCommand = {
      correlationId: randomUUID(),
      userId,
      primaryEmail: user.primaryEmail ?? '',
      userName: user.username ?? '',
      secondaryEmail,
      fullName,
      role: user.role,
      registration_No: input.studentDetails?.registrationNo ?? '',
    };

    try {
      await this.userRegistrationPublisher.publish(command);
    } catch (err) {
      this.logger.error(
        JSON.stringify({
          msg: 'failed to publish user.register — user document left in pending state',
          userId,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
      throw err;
    }

    return user;
  }

  /**
   * Called when Auth Service reports auth.user-mgmt.succeeded for a pending
   * user. userId/secondaryEmail were already generated and sent to Auth
   * Service up front in createPendingUser, so this just flips authStatus to
   * active — no reply is published back.
   *
   * Idempotency: guarded on authStatus === 'pending' rather than an eventId
   * log — this event carries no eventId at all. If this user was already
   * finalized (redelivered duplicate), returns null and the caller (the
   * consumer) is a no-op. Same read-then-conditionally-mutate-then-save style
   * as the rest of this service, single-instance dev setup.
   */
  async finalizeAfterAuthentication(userId: string): Promise<User | null> {
    const user = await this.userModel.findOne({ userId });
    if (!user || user.authStatus !== 'pending') {
      this.logger.warn(
        JSON.stringify({
          msg: 'skipping auth.user-mgmt.succeeded — no pending user for this userId (unknown or already processed)',
          userId,
        }),
      );
      return null;
    }

    user.authStatus = 'active';
    await user.save();
    return user;
  }

  async recordAuthenticationFailure(userId: string, errorMessage: string): Promise<void> {
    const user = await this.userModel.findOne({ userId });
    if (!user) {
      this.logger.warn(JSON.stringify({ msg: 'auth.user-mgmt.failed for unknown userId', userId }));
      return;
    }
    user.authStatus = 'failed';
    user.failureReason = errorMessage;
    await user.save();
  }

  async findByUserId(userId: string): Promise<User> {
    const user = await this.userModel.findOne({ userId });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    return user;
  }

  async list(query: QueryUsersDto): Promise<{ items: User[]; total: number; page: number; limit: number }> {
    const filter: QueryFilter<User> = {};
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

  async update(userId: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userModel.findOneAndUpdate({ userId }, dto, { new: true });
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    return user;
  }
}

function deriveFullName(firstName?: string, lastName?: string): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
