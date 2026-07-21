export interface ExchangeDefinition {
  name: string;
  type: 'direct' | 'topic' | 'fanout';
  durable: boolean;
}

export const RABBITMQ_EXCHANGES = {
  USER_MANAGEMENT_EVENTS: {
    name: 'user-management.events.exchange',
    type: 'direct',
    durable: true,
  },
  AUTH_EVENTS: {
    name: 'auth.events.exchange',
    type: 'topic',
    durable: true,
  },
} as const satisfies Record<string, ExchangeDefinition>;