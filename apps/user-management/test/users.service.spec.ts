import { Types } from 'mongoose';
import { UsersService } from '../src/users/users.service';
import { UserRegistrationPublisher } from '../src/messaging/user-registration.publisher';

describe('UsersService', () => {
  let userModel: { create: jest.Mock; findOne: jest.Mock; find: jest.Mock; countDocuments: jest.Mock; findOneAndUpdate: jest.Mock };
  let publisher: { publish: jest.Mock };
  let service: UsersService;

  beforeEach(() => {
    userModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    publisher = { publish: jest.fn().mockResolvedValue(undefined) };
    service = new UsersService(userModel as any, publisher as unknown as UserRegistrationPublisher);
  });

  describe('createPendingUser', () => {
    it('creates a pending user doc and publishes user.registration', async () => {
      const createdBy = new Types.ObjectId();
      const doc = {
        _id: new Types.ObjectId(),
        role: 'student',
        username: undefined,
        nameWithInitials: 'A.B. Perera',
        primaryEmail: undefined,
        mobileNo: '0771234567',
        nic: '200301012345',
        dateOfBirth: new Date('2003-01-01'),
      };
      userModel.create.mockResolvedValue(doc);

      const result = await service.createPendingUser({
        role: 'student',
        firstName: 'A',
        lastName: 'Perera',
        nameWithInitials: 'A.B. Perera',
        dateOfBirth: new Date('2003-01-01'),
        nic: '200301012345',
        mobileNo: '0771234567',
        createdBy,
      });

      expect(result).toBe(doc);
      expect(publisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: expect.any(String),
          userId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
          role: 'student',
          userName: '',
          primaryEmail: '',
          registration_No: '',
          secondaryEmail: expect.stringContaining('@ext.uom.lk'),
        }),
      );
    });

    it('sends studentDetails.registrationNo as registration_No when present', async () => {
      const doc = { _id: new Types.ObjectId(), role: 'student', dateOfBirth: new Date() };
      userModel.create.mockResolvedValue(doc);

      await service.createPendingUser({
        role: 'student',
        nameWithInitials: 'A.B. Perera',
        dateOfBirth: new Date(),
        nic: '200301012345',
        createdBy: new Types.ObjectId(),
        studentDetails: {
          registrationNo: '200301A',
          degree: 'BSc',
          level: '1',
          department: 'CSE',
          academicYear: '2026',
          administrativeBatch: '2026-A',
        },
      });

      expect(publisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({ registration_No: '200301A' }),
      );
    });

    it('propagates a publish failure so the caller sees it (not a silently orphaned pending doc)', async () => {
      const doc = { _id: new Types.ObjectId(), role: 'student', dateOfBirth: new Date() };
      userModel.create.mockResolvedValue(doc);
      publisher.publish.mockRejectedValue(new Error('broker unreachable'));

      await expect(
        service.createPendingUser({
          role: 'student',
          nameWithInitials: 'A.B. Perera',
          dateOfBirth: new Date(),
          nic: '200301012345',
          createdBy: new Types.ObjectId(),
        }),
      ).rejects.toThrow('broker unreachable');
      expect(userModel.create).toHaveBeenCalled();
    });
  });

  describe('finalizeAfterAuthentication', () => {
    it('marks a pending user active (userId/secondaryEmail were already set at creation time)', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const doc: any = {
        userId: 'u1',
        authStatus: 'pending',
        secondaryEmail: 'u1@ext.uom.lk',
        save,
      };
      userModel.findOne.mockResolvedValue(doc);

      const result = await service.finalizeAfterAuthentication('u1');

      expect(userModel.findOne).toHaveBeenCalledWith({ userId: 'u1' });
      expect(result).toBe(doc);
      expect(result!.authStatus).toBe('active');
      expect(result!.secondaryEmail).toBe('u1@ext.uom.lk');
      expect(save).toHaveBeenCalled();
    });

    it('returns null without side effects when the user is not pending (already processed)', async () => {
      const save = jest.fn();
      const doc: any = { userId: 'u1', authStatus: 'active', save };
      userModel.findOne.mockResolvedValue(doc);

      const result = await service.finalizeAfterAuthentication('u1');

      expect(result).toBeNull();
      expect(save).not.toHaveBeenCalled();
    });

    it('returns null when the user does not exist', async () => {
      userModel.findOne.mockResolvedValue(null);

      const result = await service.finalizeAfterAuthentication('missing');

      expect(result).toBeNull();
    });
  });

  describe('recordAuthenticationFailure', () => {
    it('marks the user failed with the given error message', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const doc: any = { userId: 'u1', authStatus: 'pending', save };
      userModel.findOne.mockResolvedValue(doc);

      await service.recordAuthenticationFailure('u1', 'invalid credentials');

      expect(userModel.findOne).toHaveBeenCalledWith({ userId: 'u1' });
      expect(doc.authStatus).toBe('failed');
      expect(doc.failureReason).toBe('invalid credentials');
      expect(save).toHaveBeenCalled();
    });

    it('is a no-op when the user does not exist', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(service.recordAuthenticationFailure('missing', 'x')).resolves.toBeUndefined();
    });
  });
});
