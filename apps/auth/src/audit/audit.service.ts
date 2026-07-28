import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AuthRequestLog,
  AuthRequestLogDocument,
  AuthRequestOutcome,
} from './schemas/auth-request-log.schema';

export interface AuthRequestLogInput {
  correlationId: string;
  userId?: string;
  email?: string;
  action: string;
  outcome: AuthRequestOutcome;
  reason?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuthRequestLog.name)
    private readonly authRequestLogModel: Model<AuthRequestLogDocument>,
  ) {}

  // Persists one audit entry. Audit logging is best-effort: a failure to write
  // the log must never break the request pipeline (or turn a successful
  // registration into a NACK), so errors are swallowed and surfaced via the
  // application logger only.
  async record(entry: AuthRequestLogInput): Promise<void> {
    try {
      await this.authRequestLogModel.create(entry);
    } catch (error) {
      this.logger.error({
        message: 'Failed to persist auth request log',
        correlationId: entry.correlationId,
        outcome: entry.outcome,
        error: error.message,
      });
    }
  }
}
