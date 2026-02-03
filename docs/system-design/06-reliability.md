# Reliability Patterns

> Building resilient systems that handle failures gracefully.

---

## Table of Contents

1. [Fault Tolerance Strategies](#fault-tolerance-strategies)
2. [Retry Patterns](#retry-patterns)
3. [Graceful Degradation](#graceful-degradation)
4. [Health Checks](#health-checks)
5. [Chaos Engineering](#chaos-engineering)

---

## Fault Tolerance Strategies

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────────┐
│                    RELIABILITY LAYERS                            │
├─────────────────────────────────────────────────────────────────┤
│  1. Rate Limiting      → Prevent overload                       │
│  2. Circuit Breaker    → Stop cascade failures                  │
│  3. Timeout + Retry    → Handle transient failures              │
│  4. Fallback           → Graceful degradation                   │
│  5. Bulkhead           → Isolate failure domains                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Retry Patterns

### Exponential Backoff

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 100,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * delay * 0.1;
      await sleep(delay + jitter);
    }
  }
  throw new Error("Unreachable");
}

// Usage
const result = await withRetry(
  () => externalApi.fetchData(),
  3, // max retries
  200, // base delay
);
```

### Retry with Circuit Breaker

```typescript
import CircuitBreaker from "opossum";

const breaker = new CircuitBreaker(paymentService.charge, {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});

breaker.fallback(() => ({
  status: "queued",
  message: "Payment will be processed shortly",
}));
```

---

## Graceful Degradation

### Feature Toggles

```typescript
const features = {
  recommendations: process.env.ENABLE_RECOMMENDATIONS === "true",
  realTimeUpdates: process.env.ENABLE_WEBSOCKET === "true",
};

async function getMenu(orgId: string) {
  const menu = await menuService.getItems(orgId);

  if (features.recommendations) {
    try {
      menu.recommendations = await recommendationService.get(orgId);
    } catch {
      // Degrade gracefully - menu works without recommendations
      menu.recommendations = [];
    }
  }

  return menu;
}
```

### Cached Fallback

```typescript
async function getItemWithFallback(itemId: string) {
  try {
    return await itemService.get(itemId);
  } catch {
    // Return cached version if fresh fetch fails
    return await cache.get(`item:${itemId}`);
  }
}
```

---

## Health Checks

### Kubernetes Probes

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Health Endpoint Implementation

```typescript
app.get("/health/live", (req, res) => {
  res.status(200).json({ status: "alive" });
});

app.get("/health/ready", async (req, res) => {
  const checks = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    redis.ping(),
  ]);

  const allHealthy = checks.every((c) => c.status === "fulfilled");

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "ready" : "degraded",
    checks: {
      database: checks[0].status,
      cache: checks[1].status,
    },
  });
});
```

---

## Chaos Engineering

### Principles

1. **Start small**: Begin with non-production
2. **Define steady state**: Know what "healthy" looks like
3. **Introduce failures**: Network, disk, CPU, etc.
4. **Monitor impact**: Watch metrics during tests
5. **Fix weaknesses**: Address discovered issues

### Simple Fault Injection

```typescript
// Middleware for testing (dev/staging only)
if (process.env.ENABLE_CHAOS === "true") {
  app.use((req, res, next) => {
    // Random 10% failure rate
    if (Math.random() < 0.1) {
      return res.status(500).json({ error: "Chaos monkey!" });
    }

    // Random latency (0-500ms)
    const delay = Math.random() * 500;
    setTimeout(next, delay);
  });
}
```

---

## Reliability Checklist

```
□ Timeouts on all external calls
□ Retry with exponential backoff
□ Circuit breakers on critical paths
□ Graceful degradation for non-critical features
□ Health checks for Kubernetes
□ Alerting on error rates
□ Runbooks for common failures
```

---

## Next Steps

- [Monitoring](../monitoring/01-observability.md)
- [Deployment](../guides/deployment.md)
