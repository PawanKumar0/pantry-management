# Component Architecture

> Detailed breakdown of system components and their responsibilities.

---

## Table of Contents

1. [Server Components](#server-components)
2. [Client Components](#client-components)
3. [Infrastructure Components](#infrastructure-components)

---

## Server Components

### Module Structure

```
server/src/
├── modules/                # Domain modules
│   ├── auth/               # Authentication (JWT, SSO)
│   ├── organization/       # Tenant management
│   ├── space/              # Physical spaces (floors, rooms)
│   ├── inventory/          # Items, categories, stock
│   ├── order/              # Order processing
│   ├── payment/            # Payment processing
│   ├── session/            # Active ordering sessions
│   └── coupon/             # Discount management
├── common/                 # Shared utilities
│   ├── middleware/         # Auth, rate limit, validation
│   ├── utils/              # Helpers, error classes
│   └── types/              # TypeScript types
└── config/                 # Configuration
```

### Key Modules

| Module         | Responsibility                     | Dependencies         |
| -------------- | ---------------------------------- | -------------------- |
| `auth`         | Authentication, JWT, SSO           | Redis, DB            |
| `organization` | Multi-tenant management            | DB                   |
| `inventory`    | Item/category CRUD, stock tracking | DB, Redis (cache)    |
| `order`        | Order lifecycle, cart management   | DB, Redis, WebSocket |
| `payment`      | Payment processing, refunds        | External providers   |
| `session`      | QR code scanning, active sessions  | Redis, WebSocket     |

---

## Client Components

### Flutter App Structure

```
apps/pantry_app/lib/
├── core/                   # App-wide utilities
│   ├── config/             # Environment, constants
│   ├── router/             # GoRouter navigation
│   ├── theme/              # Design system
│   └── services/           # HTTP, WebSocket, storage
├── features/               # Feature modules
│   ├── auth/               # Login, SSO
│   ├── home/               # Dashboard
│   ├── pantry/             # Menu browsing
│   ├── orders/             # Order history, tracking
│   ├── checkout/           # Cart, payment
│   └── admin/              # Staff management
└── shared/                 # Shared widgets
```

### State Management (Riverpod)

```dart
// Provider hierarchy
Provider (services)
    └── StateNotifierProvider (business logic)
        └── FutureProvider (async data)
```

---

## Infrastructure Components

### Kubernetes Resources

| Resource    | Purpose               |
| ----------- | --------------------- |
| Deployment  | API pods (stateless)  |
| StatefulSet | PostgreSQL, Redis     |
| Service     | Internal networking   |
| Ingress     | External HTTP routing |
| ConfigMap   | Non-sensitive config  |
| Secret      | Sensitive credentials |
| HPA         | Auto-scaling          |
| PDB         | High availability     |

### Data Flow

```
Client → Ingress → API Service → API Pod → PostgreSQL/Redis
                                    ↓
                              WebSocket connections
```

---

## Next Steps

- [Data Flow](./03-data-flow.md)
- [System Overview](./01-system-overview.md)
