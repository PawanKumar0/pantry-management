# Observability & Monitoring

> Complete monitoring stack for production systems.

---

## Table of Contents

1. [Monitoring Architecture](#monitoring-architecture)
2. [Metrics (Prometheus)](#metrics-prometheus)
3. [Logging (Winston + Loki)](#logging-winston--loki)
4. [Tracing (OpenTelemetry)](#tracing-opentelemetry)
5. [Alerting](#alerting)
6. [Kubernetes Monitoring](#kubernetes-monitoring)

---

## Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY STACK                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│   │   Metrics   │    │    Logs     │    │   Traces    │                     │
│   │ (Prometheus)│    │   (Loki)    │    │  (Jaeger)   │                     │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                     │
│          │                  │                  │                             │
│          └──────────────────┼──────────────────┘                             │
│                             │                                                │
│                      ┌──────▼──────┐                                         │
│                      │   Grafana   │                                         │
│                      │  Dashboard  │                                         │
│                      └─────────────┘                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Metrics (Prometheus)

### Key Metrics to Track

| Metric                 | Type      | Labels                  |
| ---------------------- | --------- | ----------------------- |
| http_requests_total    | Counter   | method, path, status    |
| http_request_duration  | Histogram | method, path            |
| active_sessions        | Gauge     | organization_id         |
| orders_created_total   | Counter   | organization_id, status |
| database_query_seconds | Histogram | query_type              |

### Implementation

```typescript
// server/src/common/metrics/prometheus.ts
import { Registry, Counter, Histogram, Gauge } from "prom-client";

export const registry = new Registry();

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "path", "status"],
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration",
  labelNames: ["method", "path"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [registry],
});

// Middleware
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer({
    method: req.method,
    path: req.route?.path,
  });

  res.on("finish", () => {
    httpRequestsTotal.inc({
      method: req.method,
      path: req.route?.path,
      status: res.statusCode,
    });
    end();
  });

  next();
});

// Expose metrics endpoint
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", registry.contentType);
  res.end(await registry.metrics());
});
```

---

## Logging (Winston + Loki)

### Log Levels

| Level | Use Case                      |
| ----- | ----------------------------- |
| error | Exceptions, failures          |
| warn  | Degraded performance, retries |
| info  | Business events, API calls    |
| debug | Detailed debugging (dev only) |

### Winston Configuration

```typescript
// server/src/common/logging/logger.ts
import winston from "winston";
import LokiTransport from "winston-loki";

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: "pantry-api" },
  transports: [
    new winston.transports.Console(),
    new LokiTransport({
      host: process.env.LOKI_URL || "http://loki:3100",
      labels: { app: "pantry-api" },
      json: true,
    }),
  ],
});

// Structured logging
logger.info("Order created", {
  orderId: order.id,
  organizationId: order.organizationId,
  total: order.total,
});
```

---

## Tracing (OpenTelemetry)

### Setup

```typescript
// server/src/common/tracing/setup.ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { JaegerExporter } from "@opentelemetry/exporter-jaeger";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { PrismaInstrumentation } from "@prisma/instrumentation";

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || "http://jaeger:14268/api/traces",
  }),
  instrumentations: [new HttpInstrumentation(), new PrismaInstrumentation()],
});

sdk.start();
```

### Custom Spans

```typescript
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("pantry-api");

async function processOrder(orderId: string) {
  return tracer.startActiveSpan("processOrder", async (span) => {
    span.setAttribute("order.id", orderId);

    try {
      const result = await orderService.process(orderId);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

---

## Alerting

### Alert Rules

```yaml
# prometheus-rules.yaml
groups:
  - name: pantry-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High 5xx error rate

      - alert: SlowResponses
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 95th percentile latency above 2 seconds

      - alert: DatabaseConnectionsHigh
        expr: pg_stat_activity_count > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: Database connections above 80%
```

---

## Kubernetes Monitoring

### Deploy Monitoring Stack

```bash
# Add Helm repos
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts

# Install Prometheus + Grafana
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace

# Install Loki
helm install loki grafana/loki-stack \
  --namespace monitoring \
  --set grafana.enabled=false
```

### ServiceMonitor for API

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: pantry-api
  namespace: pantry
spec:
  selector:
    matchLabels:
      app: pantry-api
  endpoints:
    - port: http
      path: /metrics
      interval: 15s
```

---

## Dashboard Queries

### Grafana Examples

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate percentage
100 * rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Active orders by org
orders_active{status="pending"}
```

---

## Next Steps

- [Deployment Guide](../guides/deployment.md)
- [Troubleshooting](../guides/troubleshooting.md)
