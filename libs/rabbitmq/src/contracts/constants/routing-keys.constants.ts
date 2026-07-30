export const RABBITMQ_ROUTING_KEYS = {
    USER_REGISTER: 'user.register',
    AUTH_USER_MGMT_SUCCEEDED: 'auth.user-mgmt.succeeded',
    AUTH_USER_MGMT_FAILED: 'auth.user-mgmt.failed',
    AUTH_NOTIFICATION_SUCCEEDED: 'auth.notification.succeeded',
    AUTH_NOTIFICATION_FAILED: 'auth.notification.failed',
} as const;

// Consumer-side binding patterns. Wildcards let one queue receive every outcome
// of an event (see RABBITMQ_ROUTING_KEYS above) without a separate binding per outcome.
// auth.notification only ever publishes one outcome (succeeded — Notification
// is never told about a failed registration), so its binding is an exact key
// rather than a wildcard, same as USER_REGISTER above.
export const RABBITMQ_BINDING_KEYS = {
    USER_REGISTER: 'user.register',
    AUTH_USER_MGMT_RESULT: 'auth.user-mgmt.*',
    AUTH_NOTIFICATION_SUCCEEDED: 'auth.notification.succeeded',
} as const;