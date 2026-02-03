# System Architecture Overview

## Executive Summary

The Pantry Management System is a **multi-tenant, event-driven microservices architecture** designed for QR-based ordering in corporate meeting rooms. It handles real-time order processing, inventory management, and payment integration at scale.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                     │
│  │ Flutter App  │   │   Web App    │   │ Pantry Staff │                     │
│  │   (Mobile)   │   │   (React)    │   │   (Tablet)   │                     │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                     │
└─────────┼──────────────────┼──────────────────┼─────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EDGE LAYER                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                    Load Balancer (Azure LB / AWS ALB)              │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                    API Gateway / Ingress Controller                │     │
│  │                    (Rate Limiting, SSL Termination)                │     │
│  └────────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │   Auth      │ │  Inventory  │ │   Order     │ │  Payment    │            │
│  │  Service    │ │  Service    │ │  Service    │ │  Service    │            │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │Organization │ │   Space     │ │  Session    │ │  Coupon     │            │
│  │  Service    │ │  Service    │ │  Service    │ │  Service    │            │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │              WebSocket Server (Socket.IO + Redis Adapter)         │       │
│  └──────────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   PostgreSQL    │  │     Redis       │  │    MinIO/S3     │              │
│  │   (Primary DB)  │  │ (Cache + Pub/Sub)│  │ (Object Store)  │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      OBSERVABILITY LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ Prometheus  │ │  Grafana    │ │    Loki     │ │   Jaeger    │            │
│  │  (Metrics)  │ │ (Dashboard) │ │   (Logs)    │ │  (Traces)   │            │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Modular Monolith (Current) → Microservices (Future)

We start with a **modular monolith** for simplicity:

```
server/
└── src/
    └── modules/         ← Each module is independently deployable
        ├── auth/
        ├── organization/
        ├── space/
        ├── inventory/
        ├── session/
        ├── order/
        ├── payment/
        └── coupon/
```

**Why?**

- Reduces operational complexity for small teams
- Clear module boundaries enable easy microservice extraction
- Shared database simplifies transactions

**Migration Path:**

1. Add async message queues (RabbitMQ/Kafka)
2. Extract high-traffic modules (order, session)
3. Implement saga pattern for distributed transactions

---

### 2. Multi-Tenancy Model

```
┌─────────────────────────────────────────────────┐
│              ORGANIZATION (Tenant)              │
├─────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Users   │  │  Spaces  │  │  Items   │      │
│  └──────────┘  └──────────┘  └──────────┘      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Sessions │  │  Orders  │  │ Payments │      │
│  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────┘
```

**Isolation Strategy: Shared Database, Schema Isolation**

- Every table includes `organizationId`
- Prisma middleware enforces tenant filtering
- Indexes on `organizationId` for query performance

---

### 3. Real-Time Architecture

```
┌────────┐     ┌─────────────┐     ┌──────────────┐
│ Client ├────►│ Socket.IO   ├────►│ Redis Pub/Sub│
└────────┘     │   Server    │     └──────┬───────┘
               └─────────────┘            │
                                          ▼
               ┌─────────────┐     ┌──────────────┐
               │ Other Server├◄────┤ Redis Adapter│
               │  Instances  │     └──────────────┘
               └─────────────┘
```

**Events Published:**

- `order:created` - New order placed
- `order:updated` - Status change
- `session:expired` - Session timeout
- `inventory:low` - Low stock alert

---

## Scalability Considerations

### Horizontal Scaling

| Component   | Strategy                          |
| ----------- | --------------------------------- |
| API Servers | Stateless, scale behind LB        |
| WebSocket   | Redis adapter for multi-instance  |
| Database    | Read replicas, connection pooling |
| Cache       | Redis Cluster for HA              |

### Performance Targets

| Metric            | Target  | Strategy                    |
| ----------------- | ------- | --------------------------- |
| API Latency (p99) | < 100ms | Caching, query optimization |
| WebSocket Latency | < 50ms  | Redis pub/sub               |
| Concurrent Users  | 10,000+ | Horizontal scaling          |
| Orders/sec        | 1,000+  | Async processing            |

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                            │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Edge Security                                         │
│  • WAF (Web Application Firewall)                               │
│  • DDoS Protection                                              │
│  • SSL/TLS Termination                                          │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Authentication                                        │
│  • JWT Tokens (short-lived access, long-lived refresh)          │
│  • SSO (Azure AD, Google OAuth)                                 │
│  • API Key for service-to-service                               │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Authorization                                         │
│  • RBAC (Role-Based Access Control)                             │
│  • Tenant Isolation                                             │
│  • Resource-level permissions                                   │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: Data Security                                         │
│  • Encryption at rest (database)                                │
│  • Encryption in transit (TLS 1.3)                              │
│  • PII handling compliance                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **[Component Design](./02-components.md)** - Deep dive into each service
2. **[Data Flow](./03-data-flow.md)** - Request lifecycle
3. **[Distributed Systems](../system-design/01-distributed-systems.md)** - Scaling patterns
