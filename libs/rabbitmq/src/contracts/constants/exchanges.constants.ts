export interface ExchangeDefinition {
  name: string;
  type: 'direct' | 'topic' | 'fanout';
  durable: boolean;
}

// Auth Service <-> User Management (<-> Notification, once built) — the real,
// implemented contract.
export const RABBITMQ_EXCHANGES = {
  // User Management -> Auth Service: "please register this user" commands.
  USER_MGMT_COMMANDS: {
    name: 'user-mgmt.commands',
    type: 'direct',
    durable: true,
  },
  // Auth Service -> User Management / Notification: result events, fanned
  // out via per-consumer routing-key patterns (auth.<consumer>.*).
  AUTH_EVENTS: {
    name: 'auth.events',
    type: 'topic',
    durable: true,
  },
} as const satisfies Record<string, ExchangeDefinition>;