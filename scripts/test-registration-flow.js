const amqp = require('amqplib');
const mongoose = require('mongoose');
const { Client, Attribute, Change } = require('ldapts');
const { randomUUID } = require('crypto');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const REQUEST_EXCHANGE = 'user-management.events.exchange';
const RESPONSE_EXCHANGE = 'auth.events.exchange';
const RESPONSE_ROUTING_KEYS = ['user.provisioned', 'user.provision.failed'];
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auth-service';
const LDAP_URL = process.env.LDAP_URL || 'ldap://localhost:389';
const LDAP_USERS_OU = process.env.LDAP_USERS_OU || 'ou=users,dc=uom-mis,dc=local';
const LDAP_ADMIN_DN = process.env.LDAP_ADMIN_DN || 'cn=admin,dc=uom-mis,dc=local';
const LDAP_ADMIN_PASSWORD = process.env.LDAP_ADMIN_PASSWORD || 'admin';

let passCount = 0;
let failCount = 0;

function pass(name, detail) {
  passCount++;
  console.log(`PASS  ${name}${detail ? `\n      ${detail}` : ''}`);
}

function fail(name, detail) {
  failCount++;
  console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ''}`);
}

async function publishEvent(routingKey, data) {
  const correlationId = data.correlationId || randomUUID();
  const fullData = { ...data, correlationId };

  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();
  await channel.assertExchange(REQUEST_EXCHANGE, 'direct', { durable: true });
  channel.publish(REQUEST_EXCHANGE, routingKey, Buffer.from(JSON.stringify(fullData)), {
    persistent: true,
  });
  await channel.close();
  await connection.close();

  return correlationId;
}

// Matches responses by correlationId so stale/leftover messages from a
// previous run never get misattributed to the current test. Binds its own
// exclusive queue to the auth.events.exchange topic exchange *before*
// invoking triggerFn() (which publishes the request) - topic exchanges don't
// buffer messages for queues that aren't bound yet, so publishing first would
// race against auth's response and lose it whenever auth replies quickly
// (e.g. the dedup/validation-failure paths, which don't touch LDAP).
function waitForResponse(triggerFn, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    amqp
      .connect(RABBITMQ_URL)
      .then(async (connection) => {
        const channel = await connection.createChannel();
        await channel.assertExchange(RESPONSE_EXCHANGE, 'topic', { durable: true });
        const { queue } = await channel.assertQueue('', { exclusive: true, autoDelete: true });
        for (const routingKey of RESPONSE_ROUTING_KEYS) {
          await channel.bindQueue(queue, RESPONSE_EXCHANGE, routingKey);
        }

        let settled = false;
        const finish = async (result) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          await channel.close();
          await connection.close();
          resolve(result);
        };

        const timer = setTimeout(() => finish(null), timeoutMs);

        const correlationId = await triggerFn();

        channel.consume(queue, (msg) => {
          if (!msg || settled) return;
          const parsed = JSON.parse(msg.content.toString());
          channel.ack(msg);
          if (parsed?.correlationId === correlationId) {
            finish(parsed);
          }
          // else: stale message from an earlier run, discard and keep waiting
        });
      })
      .catch(reject);
  });
}

async function withAdminClient(fn) {
  const client = new Client({ url: LDAP_URL });
  try {
    await client.bind(LDAP_ADMIN_DN, LDAP_ADMIN_PASSWORD);
    return await fn(client);
  } finally {
    await client.unbind().catch(() => {});
  }
}

async function ldapFindUser(uid) {
  return withAdminClient(async (client) => {
    const { searchEntries } = await client.search(LDAP_USERS_OU, {
      scope: 'one',
      filter: `(uid=${uid})`,
    });
    return searchEntries[0] || null;
  });
}

async function ldapSetPassword(dn, plainPassword) {
  return withAdminClient((client) =>
    client.modify(
      dn,
      new Change({
        operation: 'replace',
        modification: new Attribute({ type: 'userPassword', values: [plainPassword] }),
      }),
    ),
  );
}

async function ldapCanBind(dn, password) {
  const client = new Client({ url: LDAP_URL });
  try {
    await client.bind(dn, password);
    return true;
  } catch {
    return false;
  } finally {
    await client.unbind().catch(() => {});
  }
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const AuthAccount = mongoose.model(
    'AuthAccount',
    new mongoose.Schema({}, { strict: false, collection: 'authaccounts' }),
  );

  // TC1 - happy path: new user, all fields present
  const userId1 = `test-${randomUUID()}`;
  const email1 = `${userId1}@example.com`;
  {
    const response = await waitForResponse(() =>
      publishEvent('user.provision.requested', {
        eventId: randomUUID(),
        userId: userId1,
        email: email1,
        fullName: 'Alice Fernando',
        role: 'student',
        address: '10 Main St, Colombo',
        regNumber: 'REG-TC1',
      }),
    );

    if (response?.eventType === 'UserProvisioned' && response.userId === userId1) {
      pass('TC1a: happy path publishes user.provisioned', JSON.stringify(response));
    } else {
      fail('TC1a: happy path publishes user.provisioned', JSON.stringify(response));
    }

    const entry = await ldapFindUser(userId1);
    const attrsOk =
      entry &&
      entry.cn === 'Alice Fernando' &&
      entry.sn === 'Fernando' &&
      entry.givenName === 'Alice' &&
      entry.mail === email1 &&
      entry.postalAddress === '10 Main St, Colombo' &&
      entry.employeeNumber === 'REG-TC1';
    if (attrsOk) {
      pass('TC1b: LDAP entry created with correct attribute mapping');
    } else {
      fail('TC1b: LDAP entry created with correct attribute mapping', JSON.stringify(entry));
    }

    const doc = await AuthAccount.findOne({ userId: userId1 }).lean();
    if (doc && doc.ldapDn && doc.role === 'student' && doc.status === 'ACTIVE') {
      pass('TC1c: Mongo AuthAccount created', JSON.stringify(doc));
    } else {
      fail('TC1c: Mongo AuthAccount created', JSON.stringify(doc));
    }
  }

  // TC2 - dedup: replay same userId, expect no duplicates
  {
    const beforeEntries = await withAdminClient((client) =>
      client.search(LDAP_USERS_OU, { scope: 'one', filter: `(uid=${userId1})` }),
    );
    const beforeCount = beforeEntries.searchEntries.length;
    const beforeDocCount = await AuthAccount.countDocuments({ userId: userId1 });

    const response = await waitForResponse(() =>
      publishEvent('user.provision.requested', {
        eventId: randomUUID(),
        userId: userId1,
        email: email1,
        fullName: 'Alice Fernando',
        role: 'student',
        regNumber: 'REG-TC1',
      }),
    );

    const afterEntries = await withAdminClient((client) =>
      client.search(LDAP_USERS_OU, { scope: 'one', filter: `(uid=${userId1})` }),
    );
    const afterCount = afterEntries.searchEntries.length;
    const afterDocCount = await AuthAccount.countDocuments({ userId: userId1 });

    if (
      response?.eventType === 'UserProvisioned' &&
      afterCount === beforeCount &&
      afterDocCount === beforeDocCount
    ) {
      pass('TC2: replayed event is deduped, no duplicate LDAP/Mongo records');
    } else {
      fail(
        'TC2: replayed event is deduped, no duplicate LDAP/Mongo records',
        `ldap ${beforeCount}->${afterCount}, mongo ${beforeDocCount}->${afterDocCount}, response=${JSON.stringify(response)}`,
      );
    }
  }

  // TC3 - optional fields omitted (no address/regNumber) - role is staff, so regNumber isn't required
  const userId3 = `test-${randomUUID()}`;
  {
    const response = await waitForResponse(() =>
      publishEvent('user.provision.requested', {
        eventId: randomUUID(),
        userId: userId3,
        email: `${userId3}@example.com`,
        fullName: 'Nimal',
        role: 'staff',
      }),
    );
    const entry = await ldapFindUser(userId3);

    if (
      response?.eventType === 'UserProvisioned' &&
      entry &&
      !entry.postalAddress &&
      !entry.employeeNumber &&
      entry.givenName === 'Nimal' &&
      entry.sn === 'Nimal'
    ) {
      pass('TC3: registration works with optional fields omitted', JSON.stringify(entry));
    } else {
      fail('TC3: registration works with optional fields omitted', JSON.stringify({ response, entry }));
    }
  }

  // TC4 - invalid payload (missing required email) is rejected by validation, service stays healthy
  {
    const userId4 = `test-${randomUUID()}`;
    const before = await AuthAccount.countDocuments({});

    const response = await waitForResponse(() =>
      publishEvent('user.provision.requested', {
        eventId: randomUUID(),
        userId: userId4,
        fullName: 'No Email User',
        role: 'staff',
      }),
    );
    const after = await AuthAccount.countDocuments({});
    const entry = await ldapFindUser(userId4);

    let healthOk = false;
    try {
      const res = await fetch('http://localhost:3001/health');
      healthOk = res.ok;
    } catch {
      healthOk = false;
    }

    if (
      response?.eventType === 'UserProvisionFailed' &&
      /email/i.test(response.reason || '') &&
      after === before &&
      !entry &&
      healthOk
    ) {
      pass('TC4: invalid payload rejected by validation, no LDAP/Mongo record, service still healthy', JSON.stringify(response));
    } else {
      fail(
        'TC4: invalid payload rejected by validation, no LDAP/Mongo record, service still healthy',
        `docCount ${before}->${after}, ldapEntry=${!!entry}, healthOk=${healthOk}, response=${JSON.stringify(response)}`,
      );
    }
  }

  // TC5 - password / bind checks
  {
    const entry = await ldapFindUser(userId1);
    if (!entry) {
      fail('TC5: password bind checks', 'user1 LDAP entry not found');
    } else {
      const dn = entry.dn;
      const knownPassword = 'Te$tP@ssw0rd123';
      await ldapSetPassword(dn, knownPassword);

      const correctBind = await ldapCanBind(dn, knownPassword);
      const wrongBind = await ldapCanBind(dn, 'wrong-password');

      if (correctBind && !wrongBind) {
        pass('TC5: correct password binds, wrong password rejected');
      } else {
        fail('TC5: correct password binds, wrong password rejected', `correctBind=${correctBind}, wrongBind=${wrongBind}`);
      }
    }
  }

  // TC6 - student payload missing regNumber is rejected by validation
  {
    const userId6 = `test-${randomUUID()}`;
    const before = await AuthAccount.countDocuments({});

    const response = await waitForResponse(() =>
      publishEvent('user.provision.requested', {
        eventId: randomUUID(),
        userId: userId6,
        email: `${userId6}@example.com`,
        fullName: 'Student Missing Reg',
        role: 'student',
      }),
    );
    const after = await AuthAccount.countDocuments({});
    const entry = await ldapFindUser(userId6);

    if (
      response?.eventType === 'UserProvisionFailed' &&
      /regNumber/i.test(response.reason || '') &&
      after === before &&
      !entry
    ) {
      pass('TC6: student without regNumber rejected by validation', JSON.stringify(response));
    } else {
      fail(
        'TC6: student without regNumber rejected by validation',
        `docCount ${before}->${after}, ldapEntry=${!!entry}, response=${JSON.stringify(response)}`,
      );
    }
  }

  console.log(`\n${passCount} passed, ${failCount} failed`);
  await mongoose.disconnect();
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test run crashed:', err);
  process.exit(1);
});
