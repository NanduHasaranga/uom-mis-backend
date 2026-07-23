## RabbitMQ Naming Convention — LMS System

---

### Ground Rules

```
- All lowercase
- Dots as separators only
- Hyphens allowed inside a service name (user-mgmt)
- No underscores
- No type suffixes (no .exchange, .queue)
```

---

### Exchange

**Pattern:** `<producer-service>.<message-class>`

| Segment | Values |
|---|---|
| `<producer-service>` | the service publishing to it |
| `<message-class>` | `commands` or `events` |

```
user-mgmt.commands
auth.events
```

---

### Queue

**Pattern:** `<consumer-service>.<domain>.<action>`

| Segment | Values |
|---|---|
| `<consumer-service>` | the service consuming from it |
| `<domain>` | business domain the event belongs to |
| `<action>` | what this queue handles |

```
auth.user.register
user-mgmt.auth.result
notification.auth.result
```

---

### Routing Key

**Commands — Pattern:** `<domain>.<action>`
```
user.register
```

**Events — Pattern:** `<domain>.<consumer-service>.<outcome>`
```
auth.user-mgmt.succeeded
auth.user-mgmt.failed
auth.notification.succeeded
auth.notification.failed
```

**Bindings — Pattern:** `<domain>.<consumer-service>.*`
```
auth.user-mgmt.*
auth.notification.*
```

---

### Full Reference

| | Pattern | Example |
|---|---|---|
| Exchange | `<producer>.<class>` | `auth.events` |
| Queue | `<consumer>.<domain>.<action>` | `user-mgmt.auth.result` |
| Command key | `<domain>.<action>` | `user.register` |
| Event key | `<domain>.<consumer>.<outcome>` | `auth.user-mgmt.succeeded` |
| Binding | `<domain>.<consumer>.*` | `auth.user-mgmt.*` |

---

### Quick Checklist Before Naming Anything

```
✅  Who publishes it?          → exchange name
✅  Who consumes it?           → queue name + routing key middle segment
✅  Is it a command or event?  → message-class + key pattern
✅  What was the outcome?      → last segment of routing key
✅  Lowercase + dots only?     → final check
```



## Updated Example

```
auth.user-mgmt.succeeded      →  tells User Mgmt to update flag to success
auth.user-mgmt.failed         →  tells User Mgmt to update flag to failed

auth.notification.succeeded   →  tells Notification to send welcome email
auth.notification.failed      →  tells Notification to send failure report to admin
```

---

## Full Updated Table

| # | Queue | Exchange | Binding | Receives |
|---|---|---|---|---|
| 1 | `auth.user.register` | `user-mgmt.commands` | `user.register` | `user.register` |
| 2 | `user-mgmt.auth.result` | `auth.events` | `auth.user-mgmt.*` | `auth.user-mgmt.succeeded` / `auth.user-mgmt.failed` |
| 3 | `notification.auth.result` | `auth.events` | `auth.notification.*` | `auth.notification.succeeded` / `auth.notification.failed` |


Auth Service is explicit about **who it is talking to** and **what happened**. Each consumer binds only its own prefix. Clean, traceable, no accidental cross-consumption.