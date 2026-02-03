# Data Flow

> How data moves through the Pantry Management System.

---

## Table of Contents

1. [Order Flow](#order-flow)
2. [Authentication Flow](#authentication-flow)
3. [Real-Time Updates](#real-time-updates)

---

## Order Flow

### Sequence Diagram

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  User   │     │   API   │     │   DB    │     │  Staff  │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │
     │ 1. Add items  │               │               │
     │──────────────▶│               │               │
     │               │ 2. Validate   │               │
     │               │──────────────▶│               │
     │               │◀──────────────│               │
     │               │               │               │
     │ 3. Place order│               │               │
     │──────────────▶│               │               │
     │               │ 4. Create     │               │
     │               │──────────────▶│               │
     │               │◀──────────────│               │
     │               │               │               │
     │               │ 5. Notify via WebSocket       │
     │               │──────────────────────────────▶│
     │               │               │               │
     │◀──────────────│               │               │
     │ 6. Order      │               │               │
     │    confirmed  │               │               │
```

### Order States

```
PENDING → CONFIRMED → PREPARING → READY → COMPLETED
    ↓         ↓           ↓          ↓
CANCELLED CANCELLED   CANCELLED  CANCELLED
```

---

## Authentication Flow

### JWT + SSO Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  User   │     │   App   │     │   API   │     │  SSO    │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │
     │ 1. Click SSO  │               │               │
     │──────────────▶│               │               │
     │               │ 2. Get URL    │               │
     │               │──────────────▶│               │
     │               │◀──────────────│               │
     │               │               │               │
     │ 3. Redirect   │               │               │
     │──────────────────────────────────────────────▶│
     │               │               │               │
     │ 4. Login      │               │               │
     │◀──────────────────────────────────────────────│
     │               │               │               │
     │ 5. Callback   │               │               │
     │──────────────────────────────▶│               │
     │               │               │ 6. Verify     │
     │               │               │──────────────▶│
     │               │               │◀──────────────│
     │               │               │               │
     │               │◀──────────────│               │
     │               │ 7. JWT tokens │               │
     │◀──────────────│               │               │
```

### Token Refresh

```
Access Token (15 min) → Use for API calls
     ↓ (expires)
Refresh Token (7 days) → Get new access token
     ↓ (used)
New Access Token
```

---

## Real-Time Updates

### WebSocket Events

| Event             | Direction      | Payload         |
| ----------------- | -------------- | --------------- |
| `order:created`   | Server → All   | Order summary   |
| `order:updated`   | Server → All   | Status change   |
| `session:started` | Server → Staff | Session details |
| `inventory:low`   | Server → Staff | Stock warning   |

### Event Flow

```
Order Update → Database → Redis Pub/Sub → All API Pods → WebSocket Clients
```

### Implementation

```typescript
// Publish order update
await redis.publish(
  "order:updated",
  JSON.stringify({
    orderId: order.id,
    status: order.status,
    organizationId: order.organizationId,
  }),
);

// Subscribe and broadcast to WebSocket clients
redis.subscribe("order:updated");
redis.on("message", (channel, message) => {
  const data = JSON.parse(message);
  io.to(`org:${data.organizationId}`).emit(channel, data);
});
```

---

## Next Steps

- [System Overview](./01-system-overview.md)
- [Component Architecture](./02-components.md)
