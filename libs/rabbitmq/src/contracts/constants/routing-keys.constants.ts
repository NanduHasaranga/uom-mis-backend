export const RABBITMQ_ROUTING_KEYS = {
    USER_REGISTER: 'user.register',
    AUTH_USER_MGMT_SUCCEEDED: 'auth.user-mgmt.succeeded',
    AUTH_USER_MGMT_FAILED: 'auth.user-mgmt.failed',
    AUTH_NOTIFICATION_SUCCEEDED: 'auth.notification.succeeded',
    AUTH_NOTIFICATION_FAILED: 'auth.notification.failed',
} as const;

// Consumer-side binding patterns. Wildcards let one queue receive every outcome
// of an event (see RABBITMQ_ROUTING_KEYS above) without a separate binding per outcome.
export const RABBITMQ_BINDING_KEYS = {
    USER_REGISTER: 'user.register',
    AUTH_USER_MGMT_RESULT: 'auth.user-mgmt.*',
    AUTH_NOTIFICATION_RESULT: 'auth.notification.*',
} as const;