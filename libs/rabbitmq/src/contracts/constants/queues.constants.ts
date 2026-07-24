export interface QueueDefinition {
    name: string;
    durable: boolean;
}

// Only queues *we* declare/consume from live here — Auth Service's own
// queue (auth.user.register) and Notification's future queue
// (notification.auth.result) are declared on their respective sides.
export const RABBITMQ_QUEUES = {
    USER_MGMT_AUTH_RESULT_QUEUE: { name: 'user-mgmt.auth.result', durable: true },
} as const satisfies Record<string, QueueDefinition>;
