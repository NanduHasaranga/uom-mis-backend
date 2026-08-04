export interface QueueDefinition {
    name: string;
    durable: boolean;
}

export const RABBITMQ_QUEUES = {
    USER_MGMT_AUTH_RESULT_QUEUE: { name: 'user-mgmt.auth.result', durable: true },
    NOTIFICATION_CREDENTIALS: { name: 'notification.auth.result', durable: true },
    AUTH_USER_REGISTRATION_REQUESTED: { name: 'auth.user.register', durable: true },
} as const satisfies Record<string, QueueDefinition>;
