export const RABBITMQ_ROUTING_KEYS = {
    USER_CREATED: 'user.created',
    AUTH_REGISTRATION_COMPLETED: 'auth.registration.completed',
    AUTH_CREDENTIALS_ISSUED: 'auth.credentials.issued',
    USER_PROVISION_REQUESTED: 'user.provision.requested',
    USER_PROVISIONED: 'user.provisioned',
    USER_PROVISION_FAILED: 'user.provision.failed',
} as const;