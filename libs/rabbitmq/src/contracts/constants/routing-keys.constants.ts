export const RABBITMQ_ROUTING_KEYS = {
    USER_CREATED: 'user.created',
    USER_REGISTRATION_REQUESTED: 'user.registration',

    AUTH_REGISTRATION_COMPLETED: 'auth.registration.completed',
    AUTH_CREDENTIALS_ISSUED: 'auth.notification.credentials-issued',

    AUTH_REGISTRATION_SUCCESS: 'auth.user-mgmt.success',
    AUTH_REGISTRATION_FAILED: 'auth.user-mgmt.failed',
} as const;