import { AuthResultConsumer } from '../src/messaging/auth-result.consumer';
import { AuthRegistrationStatus } from '@app/rabbitmq';

describe('AuthResultConsumer', () => {
  let usersService: { finalizeAfterAuthentication: jest.Mock; recordAuthenticationFailure: jest.Mock };
  let consumer: AuthResultConsumer;

  beforeEach(() => {
    usersService = {
      finalizeAfterAuthentication: jest.fn(),
      recordAuthenticationFailure: jest.fn().mockResolvedValue(undefined),
    };
    consumer = new AuthResultConsumer(usersService as any);
  });

  it('on SUCCESS, finalizes the user (no reply is published — Auth already has everything from the original request)', async () => {
    usersService.finalizeAfterAuthentication.mockResolvedValue({ _id: 'u1', authStatus: 'active' });
    await consumer.handleAuthResult({ userId: 'u1', status: AuthRegistrationStatus.SUCCESS, correlationId: 'corr-1' });
    expect(usersService.finalizeAfterAuthentication).toHaveBeenCalledWith('u1');
  });

  it('is a no-op beyond the lookup when finalizeAfterAuthentication returns null (already processed / unknown user)', async () => {
    usersService.finalizeAfterAuthentication.mockResolvedValue(null);
    await expect(consumer.handleAuthResult({ userId: 'u1', status: AuthRegistrationStatus.SUCCESS, correlationId: 'corr-1' })).resolves.toBeUndefined();
  });

  it('on FAILED, records the failure using the reason', async () => {
    await consumer.handleAuthResult({ userId: 'u1', status: AuthRegistrationStatus.FAILED, reason: 'invalid credentials', correlationId: 'corr-2' });
    expect(usersService.recordAuthenticationFailure).toHaveBeenCalledWith('u1', 'invalid credentials');
  });

  it('on FAILED with no reason given, falls back to a default message', async () => {
    await consumer.handleAuthResult({ userId: 'u1', status: AuthRegistrationStatus.FAILED, correlationId: 'corr-3' });
    expect(usersService.recordAuthenticationFailure).toHaveBeenCalledWith('u1', 'Unknown failure');
  });
});
