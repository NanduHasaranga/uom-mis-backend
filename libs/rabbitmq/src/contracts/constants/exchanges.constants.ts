export interface ExchangeDefinition {
  name: string;
  type: 'direct' | 'topic' | 'fanout';
  durable: boolean;
}

export const RABBITMQ_EXCHANGES = {
  USER_MANAGEMENT_EVENTS: {
    name: 'user-mgmt.commands',
    type: 'direct',
    durable: true,
  },
  AUTH_EVENTS: {
    name: 'auth.events',
    type: 'topic',
    durable: true,
  },
} as const satisfies Record<string, ExchangeDefinition>;