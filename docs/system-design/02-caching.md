# Caching Strategies

> **Deep Dive**: Multi-layer caching for high-performance systems.

---

## Table of Contents

1. [Cache Architecture](#cache-architecture)
2. [Caching Patterns](#caching-patterns)
3. [Redis Implementation](#redis-implementation)
4. [Cache Invalidation](#cache-invalidation)
5. [Cache Stampede Prevention](#cache-stampede-prevention)
6. [Distributed Caching](#distributed-caching)

---

## Cache Architecture

### Multi-Layer Caching

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Browser/App Local Cache                          │    │
│  │                    (LocalStorage, Hive)                             │    │
│  │                    TTL: 5 minutes                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CDN LAYER                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                  CloudFlare / Azure CDN                             │    │
│  │                  Static Assets, Images                              │    │
│  │                  TTL: 1 day                                         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────┐    ┌────────────────────────────┐          │
│  │    In-Memory Cache         │    │     Redis Cache            │          │
│  │    (Node.js LRU)           │    │     (Distributed)          │          │
│  │    TTL: 1 minute           │    │     TTL: 5-60 minutes      │          │
│  │    Size: 100MB per pod     │    │                            │          │
│  └────────────────────────────┘    └────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │              PostgreSQL Query Cache + Buffer Pool                   │    │
│  │              Materialized Views for Analytics                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Caching Patterns

### 1. Cache-Aside (Lazy Loading)

```
┌────────┐   1. Get   ┌────────┐   2. Miss   ┌──────────┐
│  App   │──────────▶│  Cache │─────────────▶│ Database │
│        │           │        │              │          │
│        │◀──────────│        │◀─────────────│          │
└────────┘   4. Use  └────────┘   3. Data    └──────────┘
      │                  ▲
      │                  │
      └──────────────────┘
         5. Populate Cache
```

```typescript
// server/src/services/cache/cacheAside.ts
async function getMenuItem(itemId: string): Promise<Item | null> {
  const cacheKey = `item:${itemId}`;

  // 1. Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Cache miss - fetch from database
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { category: true },
  });

  if (item) {
    // 3. Populate cache
    await redis.setex(cacheKey, 300, JSON.stringify(item)); // 5 min TTL
  }

  return item;
}
```

**Best For:** Read-heavy data that's okay to be slightly stale

---

### 2. Write-Through

```
┌────────┐   1. Write  ┌────────┐   2. Write  ┌──────────┐
│  App   │────────────▶│  Cache │────────────▶│ Database │
│        │◀────────────│        │◀────────────│          │
└────────┘   4. ACK    └────────┘   3. ACK    └──────────┘
```

```typescript
// server/src/services/cache/writeThrough.ts
async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<Order> {
  // 1. Update database first
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });

  // 2. Update cache synchronously
  const cacheKey = `order:${orderId}`;
  await redis.setex(cacheKey, 600, JSON.stringify(order));

  // 3. Publish event for WebSocket
  await redis.publish(`order:${orderId}`, JSON.stringify({ status }));

  return order;
}
```

**Best For:** Data that must be consistent (orders, payments)

---

### 3. Write-Behind (Write-Back)

```
┌────────┐   1. Write  ┌────────┐              ┌──────────┐
│  App   │────────────▶│  Cache │              │ Database │
│        │◀────────────│        │──async──────▶│          │
└────────┘   2. ACK    └────────┘ (background) └──────────┘
```

```typescript
// server/src/services/cache/writeBehind.ts
const writeQueue: Map<string, { data: any; retries: number }> = new Map();

async function incrementItemViews(itemId: string): Promise<void> {
  const cacheKey = `item:${itemId}:views`;

  // 1. Update cache immediately
  const views = await redis.incr(cacheKey);

  // 2. Queue for batched DB write
  writeQueue.set(cacheKey, { data: { itemId, views }, retries: 0 });
}

// Background job: flush every 30 seconds
setInterval(async () => {
  const batch = Array.from(writeQueue.entries());
  writeQueue.clear();

  for (const [key, { data }] of batch) {
    await prisma.item.update({
      where: { id: data.itemId },
      data: { views: data.views },
    });
  }
}, 30000);
```

**Best For:** High-frequency, non-critical writes (analytics, views)

---

## Redis Implementation

### Cache Service

```typescript
// server/src/services/cache/cacheService.ts
import { redis } from "@/config/redis";

export class CacheService {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  private key(id: string): string {
    return `${this.prefix}:${id}`;
  }

  async get<T>(id: string): Promise<T | null> {
    const data = await redis.get(this.key(id));
    return data ? JSON.parse(data) : null;
  }

  async set<T>(id: string, data: T, ttlSeconds = 300): Promise<void> {
    await redis.setex(this.key(id), ttlSeconds, JSON.stringify(data));
  }

  async delete(id: string): Promise<void> {
    await redis.del(this.key(id));
  }

  async deletePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(`${this.prefix}:${pattern}`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  // Cache with automatic refresh
  async getOrSet<T>(
    id: string,
    fetcher: () => Promise<T>,
    ttlSeconds = 300,
  ): Promise<T> {
    const cached = await this.get<T>(id);
    if (cached) return cached;

    const data = await fetcher();
    await this.set(id, data, ttlSeconds);
    return data;
  }
}

// Usage
const sessionCache = new CacheService("session");
const itemCache = new CacheService("item");

// Get session with auto-fetch
const session = await sessionCache.getOrSet(
  sessionId,
  () => prisma.session.findUnique({ where: { id: sessionId } }),
  3600, // 1 hour TTL
);
```

### Cache TTL Strategy

| Data Type         | TTL      | Rationale                   |
| ----------------- | -------- | --------------------------- |
| Session           | 1 hour   | Match session expiry        |
| Menu/Items        | 5 min    | Changes infrequently        |
| Organization      | 30 min   | Static configuration        |
| Order (active)    | 10 min   | Frequent status changes     |
| Order (completed) | 24 hours | Historical, rarely accessed |
| User Profile      | 15 min   | Balance of freshness        |

---

## Cache Invalidation

> "There are only two hard things in Computer Science: cache invalidation and naming things." — Phil Karlton

### Event-Based Invalidation

```typescript
// server/src/services/cache/invalidation.ts
import { EventBus } from "@/services/eventBus";

// Invalidate on data changes
EventBus.subscribe("item:updated", async ({ itemId, organizationId }) => {
  await itemCache.delete(itemId);
  await categoryCache.delete(`org:${organizationId}:menu`);
});

EventBus.subscribe("category:updated", async ({ organizationId }) => {
  await categoryCache.deletePattern(`org:${organizationId}:*`);
});

// When updating an item
async function updateItem(itemId: string, data: UpdateItemDto) {
  const item = await prisma.item.update({
    where: { id: itemId },
    data,
    include: { category: true },
  });

  // Publish invalidation event
  await EventBus.publish("item:updated", {
    itemId,
    organizationId: item.category.organizationId,
  });

  return item;
}
```

### Time-Based + Event Hybrid

```typescript
// Stale-while-revalidate pattern
async function getMenuWithSWR(organizationId: string) {
  const cacheKey = `org:${organizationId}:menu`;

  // Get cached value (even if stale)
  const cached = await redis.get(cacheKey);
  const metadata = await redis.get(`${cacheKey}:meta`);

  if (cached) {
    const { fetchedAt } = JSON.parse(metadata || "{}");
    const age = Date.now() - (fetchedAt || 0);

    // If stale (> 5 min) but within grace period (< 10 min)
    // Return stale data but refresh in background
    if (age > 300000 && age < 600000) {
      refreshMenuInBackground(organizationId); // Don't await
    }

    return JSON.parse(cached);
  }

  // No cache, fetch fresh
  return fetchAndCacheMenu(organizationId);
}
```

---

## Cache Stampede Prevention

When cache expires, many requests can hit the database simultaneously.

```
                    Cache Expires
                          │
    ┌─────────────┬───────┴───────┬─────────────┐
    │             │               │             │
    ▼             ▼               ▼             ▼
┌───────┐   ┌───────┐       ┌───────┐     ┌───────┐
│ Req 1 │   │ Req 2 │  ...  │ Req N │     │ Req N │
└───┬───┘   └───┬───┘       └───┬───┘     └───┬───┘
    │           │               │             │
    ▼           ▼               ▼             ▼
┌─────────────────────────────────────────────────┐
│              DATABASE (overwhelmed!)            │
└─────────────────────────────────────────────────┘
```

### Solution 1: Mutex Lock

```typescript
// server/src/services/cache/stampede.ts
import Redlock from "redlock";

const redlock = new Redlock([redis], {
  retryCount: 3,
  retryDelay: 100,
});

async function getWithLock<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
): Promise<T> {
  // Try cache first
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const lockKey = `lock:${key}`;

  try {
    // Acquire lock
    const lock = await redlock.acquire([lockKey], 5000);

    try {
      // Double-check cache (another request may have populated it)
      const rechecked = await redis.get(key);
      if (rechecked) return JSON.parse(rechecked);

      // Fetch and cache
      const data = await fetcher();
      await redis.setex(key, ttlSeconds, JSON.stringify(data));
      return data;
    } finally {
      await lock.release();
    }
  } catch (error) {
    // Lock failed, wait and retry from cache
    await new Promise((resolve) => setTimeout(resolve, 100));
    const retried = await redis.get(key);
    if (retried) return JSON.parse(retried);
    throw error;
  }
}
```

### Solution 2: Probabilistic Early Expiration

```typescript
// Refresh cache before it expires (probabilistically)
async function getWithEarlyRefresh<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
): Promise<T> {
  const data = await redis.get(key);
  const ttl = await redis.ttl(key);

  if (data) {
    // 10% chance to refresh if TTL < 20% remaining
    const shouldRefresh = ttl < ttlSeconds * 0.2 && Math.random() < 0.1;

    if (shouldRefresh) {
      // Refresh in background
      fetcher().then((fresh) => {
        redis.setex(key, ttlSeconds, JSON.stringify(fresh));
      });
    }

    return JSON.parse(data);
  }

  const fresh = await fetcher();
  await redis.setex(key, ttlSeconds, JSON.stringify(fresh));
  return fresh;
}
```

---

## Distributed Caching

### Redis Cluster for High Availability

```
┌─────────────────────────────────────────────────────────────────┐
│                      REDIS CLUSTER                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Shard 0       │  │   Shard 1       │  │   Shard 2       │ │
│  │  Slots 0-5460   │  │  Slots 5461-    │  │  Slots 10923-   │ │
│  │                 │  │     10922       │  │     16383       │ │
│  │  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │ │
│  │  │  Master   │  │  │  │  Master   │  │  │  │  Master   │  │ │
│  │  └─────┬─────┘  │  │  └─────┬─────┘  │  │  └─────┬─────┘  │ │
│  │        │        │  │        │        │  │        │        │ │
│  │  ┌─────▼─────┐  │  │  ┌─────▼─────┐  │  │  ┌─────▼─────┐  │ │
│  │  │  Replica  │  │  │  │  Replica  │  │  │  │  Replica  │  │ │
│  │  └───────────┘  │  │  └───────────┘  │  │  └───────────┘  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Cluster Configuration

```typescript
// server/src/config/redis.ts
import Redis from "ioredis";

export const redis = new Redis.Cluster(
  [
    { host: "redis-node-0", port: 6379 },
    { host: "redis-node-1", port: 6379 },
    { host: "redis-node-2", port: 6379 },
  ],
  {
    redisOptions: {
      password: process.env.REDIS_PASSWORD,
    },
    scaleReads: "slave", // Read from replicas
    enableReadyCheck: true,
    maxRedirections: 16,
  },
);
```

---

## What We Cache in Pantry System

| Key Pattern         | Data           | TTL | Strategy      |
| ------------------- | -------------- | --- | ------------- |
| `session:{id}`      | Active session | 1h  | Write-through |
| `org:{id}:menu`     | Full menu tree | 5m  | Cache-aside   |
| `item:{id}`         | Item details   | 5m  | Cache-aside   |
| `order:{id}`        | Order status   | 10m | Write-through |
| `user:{id}:profile` | User data      | 15m | Cache-aside   |
| `rate:{org}:{ip}`   | Rate limit     | 1m  | Counter       |

---

## Next Steps

- [Database Optimization](./03-database.md)
- [API Design Patterns](./04-api-design.md)
