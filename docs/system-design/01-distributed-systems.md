# Distributed Systems & Scaling

> **For Principal Engineers**: This document covers patterns essential for designing systems at scale.

---

## Table of Contents

1. [CAP Theorem & Trade-offs](#cap-theorem--trade-offs)
2. [Horizontal vs Vertical Scaling](#horizontal-vs-vertical-scaling)
3. [Load Balancing Strategies](#load-balancing-strategies)
4. [Database Scaling](#database-scaling)
5. [Event-Driven Architecture](#event-driven-architecture)
6. [Saga Pattern](#saga-pattern)
7. [Circuit Breaker](#circuit-breaker)
8. [Rate Limiting](#rate-limiting)
9. [Sharding Strategies](#sharding-strategies)

---

## CAP Theorem & Trade-offs

```
                    ┌─────────────────┐
                    │   CONSISTENCY   │
                    │  Every read     │
                    │  gets latest    │
                    │  write          │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌─────────┐    ┌─────────┐    ┌─────────┐
        │   CP    │    │   CA    │    │   AP    │
        │ Systems │    │ Systems │    │ Systems │
        │         │    │         │    │         │
        │ MongoDB │    │ Single  │    │ DynamoDB│
        │ Redis   │    │ Node DB │    │ Cassandra│
        │ HBase   │    │         │    │ CouchDB │
        └─────────┘    └─────────┘    └─────────┘
              │                              │
              ▼                              ▼
        ┌─────────────────┐    ┌─────────────────┐
        │  PARTITION      │    │  AVAILABILITY   │
        │  TOLERANCE      │    │  Every request  │
        │  Works despite  │    │  gets response  │
        │  network split  │    │                 │
        └─────────────────┘    └─────────────────┘
```

### Our Choice: **CP with Eventual Consistency for Non-Critical Paths**

| Operation         | Consistency Model | Rationale                   |
| ----------------- | ----------------- | --------------------------- |
| Order Creation    | Strong (CP)       | Financial accuracy required |
| Inventory Updates | Strong (CP)       | Prevent overselling         |
| Session Cache     | Eventual (AP)     | Acceptable staleness        |
| Analytics         | Eventual (AP)     | Non-critical reads          |

---

## Horizontal vs Vertical Scaling

### Vertical Scaling (Scale Up)

```
┌────────────────────────────────────────┐
│           BEFORE: 4 CPU, 8GB           │
└────────────────────────────────────────┘
                    ▼
┌────────────────────────────────────────┐
│          AFTER: 32 CPU, 128GB          │
└────────────────────────────────────────┘
```

**Pros:** Simple, no code changes
**Cons:** Hardware limits, single point of failure

### Horizontal Scaling (Scale Out)

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Server 1 │  │ Server 2 │  │ Server 3 │  │ Server N │
│  4 CPU   │  │  4 CPU   │  │  4 CPU   │  │  4 CPU   │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
      │             │             │             │
      └─────────────┴──────┬──────┴─────────────┘
                           │
                    ┌──────────────┐
                    │Load Balancer │
                    └──────────────┘
```

**Our Strategy: Horizontal scaling for API servers**

```yaml
# Kubernetes HPA (Horizontal Pod Autoscaler)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: pantry-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: pantry-api
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

---

## Load Balancing Strategies

### Algorithm Comparison

| Algorithm         | Use Case              | Our Usage            |
| ----------------- | --------------------- | -------------------- |
| Round Robin       | Equal distribution    | Default API          |
| Least Connections | Variable request time | Long-running queries |
| IP Hash           | Session affinity      | WebSocket (fallback) |
| Weighted          | Canary deployments    | Blue-green deploys   |

### Implementation

```typescript
// server/src/common/middleware/loadbalancing.ts

// Health check endpoint for load balancer
app.get("/health", async (req, res) => {
  const checks = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    redis.ping(),
  ]);

  const healthy = checks.every((c) => c.status === "fulfilled");

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    checks: {
      database: checks[0].status,
      cache: checks[1].status,
    },
  });
});
```

---

## Database Scaling

### Read Replicas Pattern

```
┌─────────────────┐
│   Application   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────────────────────────────┐
│ WRITE  │ │           READ                 │
│        │ │ ┌────────┐ ┌────────┐ ┌──────┐ │
│ Primary│ │ │Replica1│ │Replica2│ │Rep N │ │
│   DB   │ │ └────────┘ └────────┘ └──────┘ │
└────────┘ └────────────────────────────────┘
```

### Prisma Configuration for Read Replicas

```typescript
// server/src/config/database.ts
import { PrismaClient } from "@prisma/client";

// Primary for writes
export const prismaWrite = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL_PRIMARY },
  },
});

// Read replicas for queries
export const prismaRead = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL_REPLICA },
  },
});

// Usage in services
class OrderService {
  async getOrder(id: string) {
    return prismaRead.order.findUnique({ where: { id } });
  }

  async createOrder(data: CreateOrderDto) {
    return prismaWrite.order.create({ data });
  }
}
```

### Connection Pooling

```typescript
// server/src/config/database.ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `${process.env.DATABASE_URL}?connection_limit=20&pool_timeout=10`,
    },
  },
});
```

**Production Settings:**

- `connection_limit`: 20-50 per pod
- `pool_timeout`: 10 seconds
- Total connections = pods × pool_size (e.g., 10 pods × 20 = 200)

---

## Event-Driven Architecture

### Message Queue Pattern

```
┌─────────────┐     ┌───────────────┐     ┌─────────────┐
│   Order     │────▶│  Message      │────▶│  Inventory  │
│   Service   │     │  Queue        │     │  Service    │
└─────────────┘     │  (RabbitMQ)   │     └─────────────┘
                    │               │
                    │               │────▶┌─────────────┐
                    │               │     │  Payment    │
                    │               │     │  Service    │
                    └───────────────┘     └─────────────┘
                            │
                            │────────────▶┌─────────────┐
                                          │Notification │
                                          │  Service    │
                                          └─────────────┘
```

### Redis Pub/Sub Implementation (Current)

```typescript
// server/src/services/eventBus.ts
import { redis } from "@/config/redis";

export const EventBus = {
  publish: async (channel: string, data: any) => {
    await redis.publish(channel, JSON.stringify(data));
  },

  subscribe: (channel: string, handler: (data: any) => void) => {
    const subscriber = redis.duplicate();
    subscriber.subscribe(channel);
    subscriber.on("message", (ch, message) => {
      if (ch === channel) {
        handler(JSON.parse(message));
      }
    });
    return subscriber;
  },
};

// Usage
EventBus.publish("order:created", { orderId, organizationId });
```

---

## Saga Pattern

For distributed transactions across services:

### Choreography (Event-Based)

```
┌──────────┐    Order      ┌───────────┐    Payment     ┌──────────┐
│  Order   │──Created────▶│  Payment  │───Completed──▶│ Inventory│
│ Service  │              │  Service  │               │ Service  │
└──────────┘              └───────────┘               └──────────┘
      ▲                         │                          │
      │         Payment         │                          │
      └────────Failed──────────┘                          │
      │                                                    │
      └──────────────Inventory Reserved───────────────────┘
```

### Orchestration (Coordinator-Based)

```typescript
// server/src/services/orderSaga.ts
class OrderSagaOrchestrator {
  async execute(orderData: CreateOrderDto) {
    const saga = new Saga();

    try {
      // Step 1: Reserve inventory
      const reservation = await saga.step(
        () => inventoryService.reserve(orderData.items),
        () => inventoryService.release(orderData.items), // Compensate
      );

      // Step 2: Process payment
      const payment = await saga.step(
        () => paymentService.charge(orderData.total),
        () => paymentService.refund(payment.id), // Compensate
      );

      // Step 3: Create order
      const order = await saga.step(
        () => orderService.create(orderData),
        () => orderService.cancel(order.id), // Compensate
      );

      return order;
    } catch (error) {
      await saga.rollback();
      throw error;
    }
  }
}
```

---

## Circuit Breaker

Prevents cascade failures when downstream services are unhealthy.

```
     ┌─────────────────────────────────────────────────────────┐
     │                  CIRCUIT BREAKER                        │
     │                                                         │
     │   ┌──────────┐         ┌──────────┐         ┌────────┐ │
     │   │  CLOSED  │──fail──▶│   OPEN   │──wait──▶│  HALF  │ │
     │   │  (Normal)│         │(Fail fast)│        │  OPEN  │ │
     │   └────┬─────┘         └──────────┘         └───┬────┘ │
     │        │                     ▲                  │      │
     │        │                     │                  │      │
     │        └─────────────────────┴──────────────────┘      │
     │                       fail                              │
     └─────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// server/src/common/utils/circuitBreaker.ts
import CircuitBreaker from "opossum";

const options = {
  timeout: 3000, // Time before request is considered failed
  errorThresholdPercentage: 50, // Open circuit if 50% fail
  resetTimeout: 30000, // Try again after 30 seconds
};

// Wrap payment provider calls
const paymentCircuit = new CircuitBreaker(paymentProvider.charge, options);

paymentCircuit.fallback(() => {
  // Queue for retry or return cached response
  return { status: "queued", message: "Payment will be processed shortly" };
});

paymentCircuit.on("open", () => {
  alerting.notify("Payment service circuit opened");
});

// Usage
const result = await paymentCircuit.fire(orderId, amount);
```

---

## Rate Limiting

### Token Bucket Algorithm

```
┌──────────────────────────────────────────────────────────┐
│                    TOKEN BUCKET                          │
│                                                          │
│   Tokens refill at         ┌──────────────┐              │
│   rate of 10/second  ────▶ │   ████████   │  Capacity: 100│
│                            │   ████████   │              │
│                            │   ████████   │              │
│   Request consumes   ◀──── │   ████████   │              │
│   1 token                  └──────────────┘              │
│                                                          │
│   If empty → 429 Too Many Requests                       │
└──────────────────────────────────────────────────────────┘
```

### Redis-Based Implementation

```typescript
// server/src/common/middleware/rateLimit.ts
import { RateLimiterRedis } from "rate-limiter-flexible";
import { redis } from "@/config/redis";

const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rate_limit",
  points: 100, // Requests
  duration: 60, // Per 60 seconds
  blockDuration: 60, // Block for 60 seconds if exceeded
});

export const rateLimitMiddleware = async (req, res, next) => {
  try {
    const key = req.user?.organizationId || req.ip;
    await rateLimiter.consume(key);
    next();
  } catch (error) {
    res.status(429).json({
      error: "Too many requests",
      retryAfter: error.msBeforeNext / 1000,
    });
  }
};

// Different limits for different endpoints
const orderLimiter = new RateLimiterRedis({
  points: 10, // 10 orders
  duration: 60, // Per minute
});
```

---

## Sharding Strategies

When single database can't handle the load:

### Horizontal Sharding by Organization

```
┌───────────────────────────────────────────────────────────────┐
│                    SHARD ROUTER                               │
│   organizationId → hash() → shard_number                      │
└───────────────────────────────────────────────────────────────┘
        │                │                │
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Shard 0    │ │   Shard 1    │ │   Shard 2    │
│  Orgs 0-999  │ │ Orgs 1000-   │ │ Orgs 2000-   │
│              │ │    1999      │ │    2999      │
└──────────────┘ └──────────────┘ └──────────────┘
```

### Shard Key Selection

| Strategy        | Pros              | Cons                 | Best For           |
| --------------- | ----------------- | -------------------- | ------------------ |
| Organization ID | Tenant isolation  | Hotspots if uneven   | Multi-tenant SaaS  |
| Order ID        | Even distribution | Cross-tenant queries | High-volume orders |
| Geographic      | Low latency       | Complex routing      | Global apps        |
| Time-based      | Easy archival     | Range queries        | Analytics          |

**Our Choice: Organization ID**

- Natural tenant isolation
- All writes for an org go to one shard
- Avoids cross-shard transactions

---

## Summary: Scaling Checklist

| Stage      | Users/Orders | Actions                        |
| ---------- | ------------ | ------------------------------ |
| MVP        | 0-1K         | Single server, monolith        |
| Growth     | 1K-10K       | Add Redis, read replicas       |
| Scale      | 10K-100K     | Kubernetes, horizontal scaling |
| Enterprise | 100K+        | Sharding, dedicated infra      |

---

## Next Steps

- [Caching Strategies](./02-caching.md)
- [Database Optimization](./03-database.md)
- [API Design Patterns](./04-api-design.md)
