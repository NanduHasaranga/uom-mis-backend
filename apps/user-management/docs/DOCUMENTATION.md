# User Management Service — Full Documentation

## 1. Purpose & Scope

The User Management Service is one of three microservices in the UoM MIS
event-driven backend (the other two — Auth Service and Notification Service —
are owned by other teams and are **not** built here). It owns:

- Student registration (single-entry and bulk Excel/CSV upload)
- Staff/admin registration (single-entry)
- The `users` and `bulkUploadBatches` MongoDB collections
- The async registration handshake with Auth Service and Notification Service
  over RabbitMQ

**Explicitly out of scope** (per the originating spec, confirmed not built here):
- Keycloak/LDAP integration itself (Auth Service owns this — we only verify
  JWTs against Keycloak's JWKS endpoint, we never talk to Keycloak/LDAP to
  create accounts)
- Actual email/SMS sending (Notification Service owns this — we only publish
  the event that tells it to)
- The Admin/User frontends
- API Gateway (Kong) configuration

This service never stores a password, and never calls Auth Service or
Notification Service directly over HTTP — the only channel between the three
microservices is RabbitMQ (see [§6](#6-rabbitmq-contract)).

## 2. Architecture Overview

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        AdminSPA["Admin Frontend (SPA)"]
        UserSPA["User Frontend (SPA)"]
    end

    Gateway["API Gateway (Kong)\nHTTPS"]

    subgraph UMS["User Management Service (this repo)"]
        HTTP["HTTP layer\nControllers + Guards + Pipes"]
        Svc["Service layer\nUsersService / BulkUploadService"]
        Mongo[("MongoDB\nusers · bulkUploadBatches · processedEvents")]
        MsgMod["Messaging layer\nPublishers + Consumer"]
    end

    Exchange{{"RabbitMQ\nmis.user.events (topic exchange)"}}

    Auth["Auth Service\n(Keycloak / LDAP)"]
    Notif["Notification Service\n(SMTP / SMS)"]

    AdminSPA -- HTTPS --> Gateway
    UserSPA -- HTTPS --> Gateway
    Gateway -- HTTP /api/v1/... --> HTTP
    HTTP --> Svc
    Svc --> Mongo
    Svc --> MsgMod
    MsgMod --> Mongo
    MsgMod -- "auth.registration.requested" --> Exchange
    Exchange -- "auth.registration.requested" --> Auth
    Auth -- "user.registration.completed" --> Exchange
    Exchange -- "user.registration.completed" --> MsgMod
    MsgMod -- "notification.user.activated" --> Exchange
    Exchange -- "notification.user.activated" --> Notif
```

Key architectural decisions baked into this diagram:
- HTTP only exists between the client-facing Gateway and this service — every
  other microservice-to-microservice interaction is async, via the single
  topic exchange `mis.user.events`.
- This service owns its own MongoDB database exclusively — no other service
  reads or writes it directly.

## 3. Actors & Use Cases

**Actors**:
- **Admin** — the only human actor that calls this service directly (via the
  Gateway); authenticated as `role: admin` in their JWT.
- **Auth Service** — external system, replies asynchronously via RabbitMQ.
- **Notification Service** — external system, receives events via RabbitMQ,
  never talks back to this service.
- **Anyone (unauthenticated)** — read endpoints (`GET /users`, `GET /users/:id`,
  `GET /bulk-uploads/:batchId`, `GET /health`) require no token today; see
  [§9 Known limitations](#9-known-limitations--spec-gaps) for the caveat.

```mermaid
flowchart LR
    Admin(["👤 Admin"])
    Anyone(["👤 Any caller"])
    AuthSvc(["🔌 Auth Service"])
    NotifSvc(["🔌 Notification Service"])

    subgraph System["User Management Service"]
        UC1(["Register student"])
        UC2(["Register staff / admin"])
        UC3(["Bulk-upload students"])
        UC4(["View batch status"])
        UC5(["List / search users"])
        UC6(["View user details"])
        UC7(["Update user profile"])
        UC8(["Check service health"])
        UC9(["Publish registration request"])
        UC10(["Receive registration result"])
        UC11(["Publish activation notification"])
    end

    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC4
    Admin --> UC5
    Admin --> UC7
    Anyone --> UC5
    Anyone --> UC6
    Anyone --> UC8

    UC1 -.->|includes| UC9
    UC2 -.->|includes| UC9
    UC3 -.->|includes, once per row| UC9

    AuthSvc --> UC10
    UC10 -.->|includes, on success| UC11
    UC11 --> NotifSvc
```

### Use case narratives

| Use case | Trigger | Outcome |
|---|---|---|
| Register student | Admin submits single-student form | `pending` user created, `auth.registration.requested` published, `202` returned with `userId` |
| Register staff/admin | Admin submits single staff/admin form | Same as above, `role` taken from the request body |
| Bulk-upload students | Admin uploads Excel/CSV + batch metadata | File parsed and validated up front; on any row error, **zero** users are created and the batch records the rejection; otherwise one `pending` user + one publish per valid row |
| View batch status | Admin (or anyone) queries a `batchId` | Batch totals + live `authStatus` counts across the batch's users |
| List / search users | Any caller, with filters | Paginated list |
| View user details | Any caller, by `id` | Single user document |
| Update user profile | Admin, by `id` | Editable fields only — not `username`/`role`/`authStatus` |
| Check service health | Any caller | Liveness probe |
| Publish registration request | Internal — fired by the three registration use cases | `auth.registration.requested` event on `mis.user.events` |
| Receive registration result | Auth Service replies async | `authStatus` updated to `active`/`failed`; idempotent against redelivery |
| Publish activation notification | Internal — fired only when the result above is a success | `notification.user.activated` event on `mis.user.events` |

## 4. Database Schema (ERD)

```mermaid
erDiagram
    USER {
        ObjectId _id PK
        string username UK "sparse, optional"
        string role "student | staff | admin"
        string authStatus "pending | active | failed"
        string keycloakUserId
        string failureReason
        string firstName
        string lastName
        string nameWithInitials "required"
        string fullName
        string title
        Date dateOfBirth "required"
        string nic UK "required, sparse"
        string primaryEmail UK "sparse, optional"
        string secondaryEmail
        string gender "Male | Female | Other"
        string currentAddress
        string homeTelephoneNo
        string mobileNo
        string permanentAddress
        string telephone
        ObjectId batchId FK "ref BulkUploadBatch, optional"
        ObjectId createdBy "admin id, required"
        Date loginLinkSentAt
        Date createdAt
        Date updatedAt
    }

    STUDENT_DETAILS {
        string registrationNo UK "6 digits + 1 letter"
        Date registrationDate
        string degree "required"
        string faculty
        string level "required"
        string department "required"
        string departmentGroup
        string specialization
        string academicYear "required"
        string administrativeBatch "required"
        string alIndexNumber
        number zScore
        string medium
        string meritCategory
        string districtNo
        string religionNo
        string ethnicityNo
    }

    STAFF_DETAILS {
        string departmentDivision "required"
        string officeExtension
        string designation "required"
        string category
    }

    BULK_UPLOAD_BATCH {
        ObjectId _id PK
        string fileName "required"
        ObjectId uploadedBy "admin id, required"
        string role "student | staff"
        Object batchMetadata "degree, faculty, department, specialization, level, academicYear, administrativeBatch, registrationDate"
        number totalRows
        number createdCount
        number failedRowCount
        string_array rowErrors
        Date createdAt
        Date updatedAt
    }

    PROCESSED_EVENT {
        ObjectId _id PK
        string eventId UK "required, RabbitMQ idempotency key"
        string eventType "required"
        string correlationId "loose ref to User._id"
        Date createdAt
        Date updatedAt
    }

    USER ||--o| STUDENT_DETAILS : "embeds when role=student"
    USER ||--o| STAFF_DETAILS : "embeds when role=staff/admin"
    BULK_UPLOAD_BATCH ||--o{ USER : "batchId (bulk-uploaded rows only)"
    USER ||--o{ PROCESSED_EVENT : "correlationId (not FK-enforced)"
```

`STUDENT_DETAILS`/`STAFF_DETAILS` are embedded sub-documents
(`@Schema({ _id: false })`), not separate collections — only one is populated
per user, depending on `role`. `batchId` only exists on bulk-uploaded users.
`PROCESSED_EVENT.correlationId` is a loose reference (a string carried
through from the RabbitMQ envelope) — Mongo has no FK enforcement across
collections, so nothing guarantees it points at a real `USER._id` beyond the
application logic always setting it that way.

## 5. Sequence Diagrams

### 5.1 Single registration — success path

```mermaid
sequenceDiagram
    actor Admin
    participant API as UsersController
    participant Guard as RolesGuard
    participant Svc as UsersService
    participant Mongo
    participant MQ as RabbitMQ (mis.user.events)
    participant AuthSvc as Auth Service
    participant Consumer as AuthRegistrationResultConsumer
    participant Idem as ProcessedEventsService
    participant NotifPub as NotificationPublisher
    participant NotifSvc as Notification Service

    Admin->>API: POST /users/students (Bearer JWT)
    API->>Guard: RolesGuard.canActivate()
    Guard-->>API: OK (role=admin)
    API->>Svc: createPendingUser(input)
    Svc->>Mongo: insert User {authStatus: pending}
    Svc->>MQ: publish auth.registration.requested
    Svc-->>API: user (with _id)
    API-->>Admin: 202 Accepted {userId}

    MQ->>AuthSvc: auth.registration.requested
    Note over AuthSvc: creates Keycloak account,<br/>generates credentials
    AuthSvc->>MQ: publish user.registration.completed {status: success}

    MQ->>Consumer: user.registration.completed
    Consumer->>Idem: markProcessed(eventId)
    Idem-->>Consumer: true (first time seen)
    Consumer->>Svc: applyRegistrationResult(data)
    Svc->>Mongo: update User {authStatus: active, keycloakUserId, username}
    Svc-->>Consumer: updated user
    Consumer->>NotifPub: publish(...)
    NotifPub->>MQ: publish notification.user.activated
    MQ->>NotifSvc: notification.user.activated
    Note over NotifSvc: sends email/SMS with login link
```

### 5.2 Single registration — Auth Service rejects it

```mermaid
sequenceDiagram
    participant AuthSvc as Auth Service
    participant MQ as RabbitMQ
    participant Consumer as AuthRegistrationResultConsumer
    participant Idem as ProcessedEventsService
    participant Svc as UsersService
    participant Mongo

    AuthSvc->>MQ: user.registration.completed {status: failed, failureReason}
    MQ->>Consumer: deliver
    Consumer->>Idem: markProcessed(eventId)
    Idem-->>Consumer: true
    Consumer->>Svc: applyRegistrationResult(data)
    Svc->>Mongo: update User {authStatus: failed, failureReason}
    Note over Consumer: authStatus !== 'active' →<br/>notification.user.activated is NOT published
```

### 5.3 Redelivery — idempotency in action

```mermaid
sequenceDiagram
    participant MQ as RabbitMQ
    participant Consumer as AuthRegistrationResultConsumer
    participant Idem as ProcessedEventsService

    MQ->>Consumer: user.registration.completed (eventId=E1) — 1st delivery
    Consumer->>Idem: markProcessed(E1)
    Idem->>Idem: insert {eventId: E1} — succeeds
    Idem-->>Consumer: true
    Note over Consumer: proceeds normally (update user, maybe notify)

    Note over MQ,Consumer: connection drop before ack → RabbitMQ redelivers

    MQ->>Consumer: user.registration.completed (eventId=E1) — 2nd delivery
    Consumer->>Idem: markProcessed(E1)
    Idem->>Idem: insert {eventId: E1} — duplicate key (11000)
    Idem-->>Consumer: false
    Note over Consumer: returns immediately —<br/>no duplicate update, no duplicate notification
```

### 5.4 Bulk upload — parse failure vs. partial row failure

```mermaid
sequenceDiagram
    actor Admin
    participant API as BulkUploadController
    participant Svc as BulkUploadService
    participant Parser as ExcelParserService
    participant Mongo
    participant Users as UsersService

    Admin->>API: POST /users/bulk-upload (file + batchMetadata)
    API->>Svc: processUpload(file, metadata, uploadedBy)
    Svc->>Parser: parse(file)
    Parser-->>Svc: {rows, rowErrors, attemptedRowCount}

    alt rowErrors is non-empty
        Svc->>Mongo: insert BulkUploadBatch {createdCount: 0, failedRowCount: totalRows, rowErrors}
        Note over Svc: NO User documents created — reject up front
        Svc-->>API: batch (rejected)
    else rows all valid
        Svc->>Mongo: insert BulkUploadBatch {createdCount: 0, failedRowCount: 0}
        loop each valid row
            Svc->>Users: createPendingUser(row)
            alt succeeds
                Users-->>Svc: user
            else throws (publish failure or Mongoose validation)
                Note over Svc: caught per-row — logged,<br/>added to rowErrors, does NOT abort the loop
            end
        end
        Svc->>Mongo: update BulkUploadBatch {createdCount, failedRowCount, rowErrors}
        Svc-->>API: batch (partial or full success)
    end
    API-->>Admin: {batchId, totalRows, createdCount, failedRowCount, rowErrors}
```

### 5.5 RBAC — token verification (stub vs. JWKS)

```mermaid
sequenceDiagram
    actor Admin
    participant API as Controller
    participant Guard as RolesGuard
    participant TV as TokenVerifier (injected)
    participant JWKS as Keycloak JWKS endpoint

    Admin->>API: request + Authorization: Bearer <jwt>
    API->>Guard: canActivate()
    Guard->>Guard: read @Roles metadata (e.g. ['admin'])
    Guard->>Guard: extract token from header (401 if missing)
    Guard->>TV: verify(token)

    alt TOKEN_VERIFIER_MODE=jwks
        TV->>TV: decode JWT header → kid
        TV->>JWKS: fetch signing key for kid (cached)
        JWKS-->>TV: public key
        TV->>TV: jwt.verify(token, publicKey)
    else TOKEN_VERIFIER_MODE=stub
        TV->>TV: base64url-decode payload (NO signature check)
    end

    TV-->>Guard: {sub, roles}
    alt required role present in roles
        Guard-->>API: allow — req.user = {sub, roles}
    else
        Guard-->>API: throw ForbiddenException (403)
    end
```

## 6. State Diagram — `authStatus` lifecycle

```mermaid
stateDiagram-v2
    [*] --> pending: user created (single or bulk row)
    pending --> active: user.registration.completed {status: success}
    pending --> failed: user.registration.completed {status: failed}
    active --> [*]
    failed --> [*]

    note right of pending
        Set immediately on User.create(),
        before auth.registration.requested
        is even published.
    end note

    note right of active
        keycloakUserId + username (if newly
        assigned) are stored here. Triggers
        notification.user.activated.
    end note

    note right of failed
        failureReason stored. No further
        automatic transition — an admin
        would need to re-register manually
        (not currently an endpoint).
    end note
```

## 7. Module Reference

| Path | Responsibility |
|---|---|
| `config/configuration.ts` | Single `@nestjs/config` factory — every env var flows through here |
| `common/guards/token-verifier.interface.ts` | `TokenVerifier` interface + DI token |
| `common/guards/keycloak-jwks-token-verifier.ts` | Real JWT verification via `jsonwebtoken` + `jwks-rsa` |
| `common/guards/stub-token-verifier.ts` | Unsigned decode, local dev/test only |
| `common/guards/roles.guard.ts` | `RolesGuard` — the actual per-route auth enforcement |
| `common/decorators/roles.decorator.ts` | `@Roles(...)` metadata decorator |
| `common/filters/http-exception.filter.ts` | Normalizes all error responses |
| `common/interceptors/logging.interceptor.ts` | One structured JSON log line per request |
| `common/utils/admin-id.util.ts` | Maps a Keycloak `sub` (UUID) → deterministic Mongo `ObjectId` |
| `common/common.module.ts` | Wires `RolesGuard` + `TOKEN_VERIFIER`, exported to whoever needs them |
| `users/schemas/user.schema.ts` | The `users` collection |
| `users/dto/*.ts` | Request validation for all `/users/*` endpoints |
| `users/users.service.ts` | Core logic: create-pending, apply-result, list/find/update |
| `users/users.controller.ts` | `/users/*` HTTP routes |
| `users/users.module.ts` | Wires the above; `forwardRef` to `MessagingModule` |
| `bulk-upload/schemas/bulk-upload-batch.schema.ts` | The `bulkUploadBatches` collection |
| `bulk-upload/parsers/excel-parser.service.ts` | Column-mapped Excel/CSV parsing + row validation |
| `bulk-upload/dto/bulk-upload-metadata.dto.ts` | Validates the multipart `batchMetadata` field |
| `bulk-upload/bulk-upload.service.ts` | Orchestrates parse → per-row create → batch status |
| `bulk-upload/bulk-upload.controller.ts` | `/users/bulk-upload`, `/bulk-uploads/:batchId` |
| `bulk-upload/bulk-upload.module.ts` | Wires the above |
| `messaging/envelope.util.ts` | `buildEnvelope()` — single source of envelope shape |
| `messaging/contracts/*.ts` | Event payload interfaces + exchange/queue name constants |
| `messaging/publishers/*.ts` | `AuthRegistrationPublisher`, `NotificationPublisher` |
| `messaging/consumers/auth-registration-result.consumer.ts` | Consumes `user.registration.completed` |
| `messaging/idempotency/*.ts` | `processedEvents` collection + `markProcessed()` guard |
| `messaging/mock/mock-auth.consumer.ts` | Dev-only simulated Auth Service reply |
| `messaging/messaging.module.ts` | `RabbitMQModule.forRootAsync` + wires all of the above |
| `health/health.controller.ts` | `GET /health` |
| `main.ts` | Bootstrap — loads `.env`, global prefix, pipes, filter, interceptor |
| `app.module.ts` | Root module composition |

(Full prose walkthrough of every file, including the "why" behind several
non-obvious decisions, is in `../README.md` — this table is the map, that's
the terrain.)

## 8. API Reference

Base path `/api/v1` (except `/health`). Write endpoints require
`Authorization: Bearer <jwt>` with `admin` in the token's `roles`.

### `POST /users/students` — admin

Request body (`CreateStudentDto`):
```json
{
  "firstName": "Amal",
  "lastName": "Perera",
  "nameWithInitials": "A.B. Perera",
  "fullName": "Amal Bandara Perera",
  "title": "Mr",
  "dateOfBirth": "2003-01-15",
  "nic": "200301501234",
  "primaryEmail": "amal.perera@example.com",
  "secondaryEmail": "amal.p@gmail.com",
  "gender": "Male",
  "currentAddress": "12 Lake Drive, Colombo",
  "homeTelephoneNo": "0112345678",
  "mobileNo": "0771234567",
  "permanentAddress": "12 Lake Drive, Colombo",
  "telephone": "0112345678",
  "studentDetails": {
    "registrationNo": "200301A",
    "registrationDate": "2025-09-01",
    "degree": "BSc Eng",
    "faculty": "Engineering",
    "level": "L1",
    "department": "CSE",
    "departmentGroup": "Group A",
    "specialization": "Software Engineering",
    "academicYear": "2025/2026",
    "administrativeBatch": "2025",
    "alIndexNumber": "1234567",
    "zScore": 1.8532,
    "medium": "English",
    "meritCategory": "District",
    "districtNo": "11",
    "religionNo": "01",
    "ethnicityNo": "02"
  }
}
```
Required: `firstName`, `lastName`, `nameWithInitials`, `dateOfBirth`, `nic`,
`primaryEmail`, `studentDetails.{registrationNo, degree, level, department,
academicYear, administrativeBatch}`. Everything else optional.

Response `202 Accepted`:
```json
{ "userId": "6a4f6aa82749314f41ce024d" }
```

### `POST /users/staff` — admin

Same shape, `role: "staff" | "admin"` in the body, `staffDetails` instead of
`studentDetails` (`departmentDivision`, `officeExtension?`, `designation`,
`category?`).

### `POST /users/bulk-upload` — admin

Multipart form: `file` (`.xlsx`/`.csv`) + `batchMetadata` (JSON-stringified):
```json
{
  "role": "student",
  "degree": "BSc Eng",
  "faculty": "Engineering",
  "department": "CSE",
  "specialization": "Software Engineering",
  "level": "L1",
  "academicYear": "2025/2026",
  "administrativeBatch": "2025",
  "registrationDate": "2025-09-01"
}
```
Required: `role` (currently only `student` is actually processed —
`staff` is rejected with `400`, see [§9](#9-known-limitations--spec-gaps)),
`department`, `level`, `academicYear`, `administrativeBatch`.

Response:
```json
{
  "batchId": "6a55c4120629bcd1e54eeb86",
  "totalRows": 12,
  "createdCount": 11,
  "failedRowCount": 1,
  "rowErrors": ["Row 9: broker unreachable — Auth Service could not be notified"]
}
```

### `GET /users` — no auth required

Query params: `role`, `authStatus`, `batchId`, `search`, `page` (default 1),
`limit` (default 20).

### `GET /users/:id` — no auth required
### `PUT /users/:id` — admin

Body (`UpdateUserDto`, all optional): `firstName`, `lastName`,
`nameWithInitials`, `fullName`, `title`, `primaryEmail`, `secondaryEmail`,
`gender`, `currentAddress`, `homeTelephoneNo`, `mobileNo`,
`permanentAddress`, `telephone`. **Not** editable: `username`, `role`,
`authStatus`.

### `GET /bulk-uploads/:batchId` — no auth required

```json
{
  "batch": { "_id": "...", "fileName": "...", "totalRows": 12, "createdCount": 11, "failedRowCount": 1, "rowErrors": [] },
  "authStatusCounts": { "pending": 2, "active": 8, "failed": 1 }
}
```

### `GET /health`

```json
{ "status": "ok", "timestamp": "2026-07-14T09:32:13.005Z" }
```

## 9. Known Limitations & Spec Gaps

- **Read endpoints are unauthenticated.** `GET /users`, `GET /users/:id`, and
  `GET /bulk-uploads/:batchId` have no guard, matching the spec's literal "on
  all *write* endpoints" — worth confirming this is actually intended before
  shipping, since `GET /users` currently returns full PII (NIC, DOB, address,
  phone) to anyone who can reach the service.
- **Bulk upload is student-only.** The spec says it should be "structured so
  it can be reused for staff later" — the schema and `BulkUploadBatch.role`
  already allow `staff`, but `BulkUploadService.processUpload` throws `400`
  for anything other than `student` today; the Excel column map is
  student-specific.
- **`DOB` vs. schema requirement mismatch.** The upload template's column
  table doesn't mark `DOB` as "Must" even though `User.dateOfBirth` is
  `required: true`, and marks `Permanent address` as "Must" even though the
  schema doesn't require it. Rows missing `DOB` pass the parser's row
  validation but fail at `User.create()` — caught per-row (doesn't abort the
  batch) rather than at the earlier file-level check.
- **`processedEvents` has no TTL/cleanup.** Deliberately simple for a
  single-instance dev setup; grows unboundedly in a long-lived deployment.
- **Failed registrations have no retry endpoint.** Once `authStatus: failed`,
  there's no built-in way to re-trigger `auth.registration.requested` — an
  admin would need to re-register the user from scratch (a new document).
- **Username auto-assignment format is unconfirmed** with the Auth team (spec
  §9, open item) — `MockAuthConsumer` invents `role.last6ofid` as a
  placeholder format purely for local testing.

## 10. Non-Functional Requirements Coverage

| Requirement | How it's met |
|---|---|
| DTO validation, 400 on failure | Global `ValidationPipe` (`whitelist`, `transform`, `forbidNonWhitelisted`) |
| Publish failure ≠ silent orphan | Single registration: rethrown, surfaces as a failed HTTP response. Bulk: caught per-row, tallied into `rowErrors`/`failedRowCount`, visible via the status endpoint |
| Structured JSON logging | `LoggingInterceptor` (per-request) + every service/consumer logs `JSON.stringify({...})` with `correlationId` where relevant |
| `.env.example` | Present, all 5 required vars + 2 dev-only flags |
| Unit tests | `UsersService`, `BulkUploadService`, both consumers — 15 tests, Mongo/AMQP mocked |
| `docker-compose.yml` for local dev | Mongo + RabbitMQ (management UI) + this service |

## 11. Environment Variables

| Variable | Default (if unset) | Purpose |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017/user-management` | Mongo connection string |
| `RABBITMQ_URI` | `amqp://localhost:5672` | RabbitMQ connection string |
| `RABBITMQ_EXCHANGE` | `mis.user.events` | Topic exchange name |
| `KEYCLOAK_JWKS_URI` | *(empty — throws if used in `jwks` mode)* | JWKS endpoint for real token verification |
| `PORT` | `3000` | HTTP listen port |
| `LOGIN_URL` | `http://localhost:4200/login` | Included in `notification.user.activated` payload |
| `TOKEN_VERIFIER_MODE` | `jwks` | `stub` (no signature check, local dev/test) or `jwks` (real Keycloak verification) |
| `AUTH_SERVICE_MOCK_ENABLED` | `false` (unset) | `true` registers `MockAuthConsumer`, simulating Auth Service replies. Local dev/test only — the consumer's constructor throws if `NODE_ENV=production` as a backstop |

`TOKEN_VERIFIER_MODE` and `AUTH_SERVICE_MOCK_ENABLED` are deliberately kept
separate — they gate unrelated concerns (auth bypass vs. message-flow
simulation) and conflating them would make it easy to accidentally leave one
on.

## 12. Testing

```bash
npx jest apps/user-management
```

`test/users.service.spec.ts`, `test/bulk-upload.service.spec.ts`,
`test/messaging.consumer.spec.ts` — 15 pure unit tests. Mongoose models and
`AmqpConnection` are mocked; no real Mongo/RabbitMQ needed to run them.

## 13. Deployment

`docker-compose.yml` + `Dockerfile` live in `apps/user-management/`, but the
Dockerfile's build **context is the monorepo root** (`../..`) since this app
shares one root `package.json`/`node_modules` with `api-gateway`/`auth`/
`notification` — not a per-app install.

```bash
docker compose -f apps/user-management/docker-compose.yml up -d
```

Brings up Mongo, RabbitMQ (management UI on `:15672`), and the service
itself on `:3000`, with `TOKEN_VERIFIER_MODE=stub` and
`AUTH_SERVICE_MOCK_ENABLED=true` by default for a fully self-contained local
stack — override both via env for anything resembling a real deployment.

## 14. Troubleshooting Log (real issues hit while building this)

Kept here as institutional memory — these are exactly the kind of thing that
re-bites the next person who touches this service.

1. **`jose@6` is ESM-only, crashes CommonJS webpack build with
   `ERR_REQUIRE_ESM`.** Worse, `jwks-rsa@4.x` depends on `jose@^6` internally,
   so the crash resurfaced one dependency layer down even after removing our
   own `jose` import. Fixed by using `jsonwebtoken` + `jwks-rsa@^3.2.2`
   (pinned below 4.x, which depends on `jose@^4` — the last dual CJS/ESM
   release).
2. **`RolesGuard`/`TOKEN_VERIFIER` registered on `AppModule`, but consumed by
   controllers in sibling modules (`UsersModule`, `BulkUploadModule`).**
   Nest's DI doesn't grant a module access to its *parent's* providers, only
   to what it explicitly imports — this crashed on boot with
   `Nest can't resolve dependencies of RolesGuard`, only caught by actually
   starting the app (not by unit tests or the build). Fixed by extracting
   `CommonModule`, imported by both.
3. **`exceljs`'s own `index.d.ts` declares `interface Buffer extends
   ArrayBuffer {}`**, a module-local shadow of the real Buffer type that
   breaks structural typing for `workbook.xlsx.load(buffer)`. Not a
   dependency-version conflict (ruled out by deduping `@types/node`) — an
   upstream defect in exceljs's own types. Fixed with a targeted `as any` at
   that one call site.
4. **Cross-drive `node_modules` resolution failure** when a throwaway test
   script lived outside the repo (`C:\...\Temp\...` vs. the repo on `D:\...`)
   — Node resolves `node_modules` by walking up from the script's own path,
   so it never found the repo's dependencies. Any ad-hoc script needs to live
   inside the repo to resolve its packages.
5. **`EADDRINUSE` port collisions** happened repeatedly during iterative dev
   — a background instance from a previous test run left the port held while
   a new `nest start` tried to bind it. Not a code bug; just a reminder to
   check `Get-NetTCPConnection -LocalPort <port>` before assuming a fresh
   start failed for a real reason.
