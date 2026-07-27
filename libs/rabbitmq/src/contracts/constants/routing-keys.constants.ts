// Convention: queues = {consumer}.{producer-domain}.{purpose};
// topic routing keys = {producer-domain}.{consumer}.{event} — so a
// single-segment wildcard binding (auth.<consumer>.*) can target each
// consumer's queue independently on the shared auth.events exchange.
export const RABBITMQ_ROUTING_KEYS = {
    USER_REGISTRATION: 'user.registration',
    AUTH_USER_MGMT_SUCCESS: 'auth.user-mgmt.success',
    AUTH_USER_MGMT_FAILED: 'auth.user-mgmt.failed',
} as const;
