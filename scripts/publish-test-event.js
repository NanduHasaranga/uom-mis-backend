const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const QUEUE = process.env.AUTH_QUEUE || 'auth.user.register';

const pattern = process.argv[2] || 'user.registration';
const overrides = process.argv[3] ? JSON.parse(process.argv[3]) : {};

const data = {
  correlationId: `corr-${Date.now()}`,
  userId: `user-${Date.now()}`,
  primaryEmail: `test.user.${Date.now()}@example.com`,
  secondaryEmail: `test.user.${Date.now()}@example.com`,
  fullName: 'Test User',
  role: 'student',
  registration_No: `REG-${Date.now()}`,
  ...overrides,
};

async function main() {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();
  await channel.assertQueue(QUEUE, { durable: true });

  const message = { pattern, data };
  channel.sendToQueue(QUEUE, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });

  console.log(`Published "${pattern}" to "${QUEUE}":`);
  console.log(JSON.stringify(message, null, 2));

  await channel.close();
  await connection.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
