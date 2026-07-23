export interface QueueDefinition {
    name: string;
    durable: boolean;
}

export const RABBITMQ_QUEUES = {
    AUTH_USER_REGISTER: { name: 'auth.user.register', durable: true },
    USER_MGMT_AUTH_RESULT: { name: 'user-mgmt.auth.result', durable: true },
    NOTIFICATION_AUTH_RESULT: { name: 'notification.auth.result', durable: true },
} as const satisfies Record<string, QueueDefinition>;