import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthRegistrationStatus } from '@app/rabbitmq';
import {
  NotificationLog,
  NotificationLogDocument,
  NotificationOutcome,
  NotificationType,
} from './schemas/notification-log.schema';

export interface NotificationLogInput {
  userId: string;
  status: AuthRegistrationStatus;
  username: string;
  email: string;
  fullName: string;
  role: string;
  occurredAt: string;
  type: NotificationType;
  subject: string;
  outcome: NotificationOutcome;
  reason?: string;
}

@Injectable()
export class NotificationLogService {
  private readonly logger = new Logger(NotificationLogService.name);

  constructor(
    @InjectModel(NotificationLog.name)
    private readonly notificationLogModel: Model<NotificationLogDocument>,
  ) {}

  // Best-effort, same as auth's AuditService: a failure to persist the log
  // must never break the notification pipeline or change its ack/nack outcome.
  async record(entry: NotificationLogInput): Promise<void> {
    try {
      await this.notificationLogModel.create(entry);
    } catch (error) {
      this.logger.error({
        message: 'Failed to persist notification log',
        email: entry.email,
        outcome: entry.outcome,
        error: error.message,
      });
    }
  }
}
