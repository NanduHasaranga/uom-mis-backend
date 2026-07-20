import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'crypto';

@Injectable()
export class EventPublisherService {
  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly clientProxy: ClientProxy,
  ) {}

  async publishUserProvisioned(payload: {
    correlationId: string;
    userId: string;
    email: string;
    role: string;
  }) {
    this.clientProxy.emit('user.provisioned', {
      eventId: randomUUID(),
      eventType: 'UserProvisioned',
      ...payload,
      publishedAt: new Date().toISOString(),
    });
  }

  async publishUserProvisionFailed(payload: {
    correlationId: string;
    userId: string;
    email: string;
    reason: string;
  }) {
    this.clientProxy.emit('user.provision.failed', {
      eventId: randomUUID(),
      eventType: 'UserProvisionFailed',
      ...payload,
      publishedAt: new Date().toISOString(),
    });
  }
}