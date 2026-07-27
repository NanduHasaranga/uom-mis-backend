export interface QueueDefinition {
    name: string;
    durable: boolean;
}

export const RABBITMQ_QUEUES = {
    AUTH_USER_CREATED: { name: 'auth.user-created.queue', durable: true },
    USER_MANAGEMENT_AUTH_STATUS: { name: 'user-mgmt.auth.result', durable: true },
    NOTIFICATION_CREDENTIALS: { name: 'notification.auth.result', durable: true },
    AUTH_USER_REGISTRATION_REQUESTED: { name: 'auth.user.register', durable: true },
} as const satisfies Record<string, QueueDefinition>;