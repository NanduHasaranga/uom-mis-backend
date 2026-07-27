# uom-mis-backend

NestJS monorepo for the University of Moratuwa MIS backend. Apps live under `apps/`:

- **`apps/auth`** — user registration/provisioning against LDAP. Implemented and documented below.
- `apps/api-gateway`, `apps/notification`, `apps/user-management` — owned by other team members, in progress.

## Architecture

Authentication is centralized at the API gateway, not spread across services:

```
Client ──► Kong (API Gateway) ──auth check──► Keycloak ──federation──► LDAP
              │
              └──(post-auth, proxied)──► user-management / notification / etc.
```

- **Kong** is the Policy Enforcement Point — redirects unauthenticated requests to Keycloak's hosted login (OIDC Authorization Code flow) and validates tokens on every request before proxying.
- **Keycloak** authenticates users by delegating the credential check to **LDAP** (User Federation) — it doesn't own passwords itself.
- **`apps/auth`** only handles user **provisioning**, not authentication: it consumes `user.provision.requested` events from RabbitMQ, writes new identities to LDAP, and records them in MongoDB. It has no login endpoint, no JWT logic, and never talks to Keycloak — Keycloak discovers provisioned users lazily via LDAP federation, the first time they log in through Kong.
- Other backend services trust Kong's enforcement and contain no auth code of their own.

See `AUTH_REGISTRATION_MODULE_REPORT.md` for the full write-up of the provisioning pipeline.

## Prerequisites

- Node.js (v22+)
- Docker + Docker Compose — runs LDAP, phpLDAPadmin, and RabbitMQ
- A running MongoDB instance — **not** provided by this repo (native install or your own container)

## Setup — Auth Service

1. Install dependencies (single `package.json` at the repo root):

   ```bash
   npm install
   ```

2. Create the env file from the template and fill in real values — `apps/auth/.env` is gitignored, so this step is required on every machine:

   ```bash
   cp apps/auth/.env.example apps/auth/.env
   ```

   Variables required at boot (validated in `apps/auth/src/config/env.validation.ts`):

   | Variable | Purpose | Example |
   |---|---|---|
   | `PORT` | HTTP port (serves `/health`) | `3001` |
   | `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/auth-service` |
   | `RABBITMQ_URL` | RabbitMQ connection URL | `amqp://localhost:5672` |
   | `AUTH_QUEUE` | Inbound provisioning queue name | `auth.user-provision.queue` |
   | `LDAP_URL` | LDAP server URL | `ldap://localhost:389` |
   | `LDAP_BASE_DN` | Base DN | `dc=uom-mis,dc=local` |
   | `LDAP_USERS_OU` | Users OU | `ou=users,dc=uom-mis,dc=local` |
   | `LDAP_ADMIN_DN` | Admin bind DN | `cn=admin,dc=uom-mis,dc=local` |
   | `LDAP_ADMIN_PASSWORD` | Admin bind password | `admin` |

3. Start LDAP and RabbitMQ:

   ```bash
   docker compose up -d
   ```

   Brings up OpenLDAP on `389`/`636`, phpLDAPadmin at `http://localhost:6080`, and RabbitMQ on `5672` (management UI at `http://localhost:15672`, default `guest`/`guest`).

4. Make sure MongoDB is running and reachable at the URL set in step 2 — install/start it yourself (native or your own container); this repo doesn't manage it.

5. Run the auth service:

   ```bash
   npx nest start auth --watch
   ```

6. Verify:

   ```bash
   curl http://localhost:3001/health
   ```

## Testing

- Unit/e2e specs: `npm run test:e2e:auth`
- Full registration flow against live infra (RabbitMQ + Mongo + LDAP must all be running): `npm run test:registration`
