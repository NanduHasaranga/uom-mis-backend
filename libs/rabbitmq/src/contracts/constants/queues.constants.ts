export interface QueueDefinition {
    name: string;
    durable: boolean;
}

export const RABBITMQ_QUEUES = {
    AUTH_USER_CREATED: { name: 'auth.user-created.queue', durable: true },
    USER_MANAGEMENT_AUTH_STATUS: { name: 'user-management.auth-status.queue', durable: true },
    NOTIFICATION_CREDENTIALS: { name: 'notification.credentials.queue', durable: true },
    AUTH_USER_PROVISION_REQUESTED: { name: 'auth.user-provision.queue', durable: true },
} as const satisfies Record<string, QueueDefinition>;