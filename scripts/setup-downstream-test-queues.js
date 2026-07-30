// Manual scaffolding for the downstream queues that user-management and
// notification own (libs/rabbitmq/src/contracts/constants/queues.constants.ts).
// Both services now declare/bind these themselves on startup (AuthResultConsumer,
// CredentialsIssuedConsumer) — use this script to inspect traffic on auth.events
// without booting either app, or to declare the queues standalone before either
// service has run.
//
// Usage:
//   node scripts/setup-downstream-test-queues.js            declare + bind both queues
//   node scripts/setup-downstream-test-queues.js --peek      print and drain queued messages
//   node scripts/setup-downstream-test-queues.js --teardown  delete both queues

const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const EXCHANGE = 'auth.events';

const QUEUES = [
  {
    name: 'user-mgmt.auth.result',
    bindingKeys: ['auth.user-mgmt.*'],
  },
  {
    name: 'notification.auth.result',
    bindingKeys: ['auth.notification.*'],
  },
];

async function setup(channel) {
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

  for (const { name, bindingKeys } of QUEUES) {
    await channel.assertQueue(name, { durable: true });
    for (const bindingKey of bindingKeys) {
      await channel.bindQueue(name, EXCHANGE, bindingKey);
    }
    console.log(`Declared "${name}" bound to [${bindingKeys.join(', ')}]`);
  }
}

async function peek(channel) {
  for (const { name } of QUEUES) {
    console.log(`\n--- ${name} ---`);
    let count = 0;
    while (true) {
      const msg = await channel.get(name, { noAck: false });
      if (!msg) break;
      count++;
      console.log(`[${count}] routingKey=${msg.fields.routingKey}`);
      console.log(msg.content.toString());
      channel.ack(msg);
    }
    console.log(count === 0 ? '(empty)' : `(drained ${count} message(s))`);
  }
}

async function teardown(channel) {
  for (const { name } of QUEUES) {
    await channel.deleteQueue(name);
    console.log(`Deleted "${name}"`);
  }
}

async function main() {
  const mode = process.argv[2] || '--setup';
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();

  if (mode === '--teardown') {
    await teardown(channel);
  } else if (mode === '--peek') {
    await peek(channel);
  } else {
    await setup(channel);
  }

  await channel.close();
  await connection.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
