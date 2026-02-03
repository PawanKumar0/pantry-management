# API Design Patterns

> RESTful API design principles and patterns.

---

## Table of Contents

1. [REST Principles](#rest-principles)
2. [URL Structure](#url-structure)
3. [Request/Response Design](#requestresponse-design)
4. [Pagination](#pagination)
5. [Error Handling](#error-handling)
6. [Versioning](#versioning)

---

## REST Principles

| Principle      | Description                        | Example                              |
| -------------- | ---------------------------------- | ------------------------------------ |
| Stateless      | No session state on server         | JWT tokens in headers                |
| Resource-based | URLs represent resources           | `/orders/123` not `/getOrder?id=123` |
| HTTP Methods   | Use verbs correctly                | GET, POST, PUT, PATCH, DELETE        |
| HATEOAS        | Include links to related resources | Links in response                    |

---

## URL Structure

### Resource Hierarchy

```
/organizations/{orgId}/spaces/{spaceId}/orders
     └─ parent ────────────└─ parent ────────└─ collection
```

### Endpoint Examples

| Method | URL                        | Action            |
| ------ | -------------------------- | ----------------- |
| GET    | `/api/v1/items`            | List all items    |
| POST   | `/api/v1/items`            | Create item       |
| GET    | `/api/v1/items/:id`        | Get single item   |
| PATCH  | `/api/v1/items/:id`        | Update item       |
| DELETE | `/api/v1/items/:id`        | Delete item       |
| GET    | `/api/v1/orders/:id/items` | Get order's items |

---

## Request/Response Design

### Request Body

```typescript
// POST /api/v1/orders
{
  "spaceId": "space-123",
  "items": [
    { "itemId": "item-456", "quantity": 2 }
  ],
  "notes": "No ice please"
}
```

### Response Body

```typescript
// 201 Created
{
  "id": "order-789",
  "status": "pending",
  "items": [...],
  "subtotal": 15.00,
  "createdAt": "2024-02-01T12:00:00Z",
  "_links": {
    "self": "/api/v1/orders/order-789",
    "cancel": "/api/v1/orders/order-789/cancel"
  }
}
```

---

## Pagination

### Cursor-Based (Recommended)

```typescript
// GET /api/v1/orders?limit=20&after=eyJpZCI6...

{
  "data": [...],
  "pagination": {
    "hasMore": true,
    "cursor": "eyJpZCI6Ijk5OSIsImNyZWF0ZWRBdCI6...",
    "limit": 20
  }
}
```

### Implementation

```typescript
async function getPaginatedOrders(cursor?: string, limit = 20) {
  const decoded = cursor ? JSON.parse(atob(cursor)) : null;

  const orders = await prisma.order.findMany({
    where: decoded
      ? {
          OR: [
            { createdAt: { lt: decoded.createdAt } },
            { createdAt: decoded.createdAt, id: { lt: decoded.id } },
          ],
        }
      : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1, // Fetch one extra to check hasMore
  });

  const hasMore = orders.length > limit;
  const data = hasMore ? orders.slice(0, -1) : orders;
  const lastItem = data[data.length - 1];

  return {
    data,
    pagination: {
      hasMore,
      cursor: lastItem
        ? btoa(
            JSON.stringify({
              id: lastItem.id,
              createdAt: lastItem.createdAt,
            }),
          )
        : null,
      limit,
    },
  };
}
```

---

## Error Handling

### Error Response Format

```typescript
// 400 Bad Request
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}

// 404 Not Found
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Order not found"
  }
}
```

### HTTP Status Codes

| Code | Meaning               | Use Case                 |
| ---- | --------------------- | ------------------------ |
| 200  | OK                    | Successful GET/PATCH     |
| 201  | Created               | Successful POST          |
| 204  | No Content            | Successful DELETE        |
| 400  | Bad Request           | Validation error         |
| 401  | Unauthorized          | Missing/invalid auth     |
| 403  | Forbidden             | Insufficient permissions |
| 404  | Not Found             | Resource doesn't exist   |
| 409  | Conflict              | Duplicate/state conflict |
| 429  | Too Many Requests     | Rate limited             |
| 500  | Internal Server Error | Unexpected server error  |

---

## Versioning

### URL Path Versioning

```
/api/v1/orders
/api/v2/orders
```

### Implementation

```typescript
// server/src/routes/index.ts
import { v1Router } from "./v1";
import { v2Router } from "./v2";

app.use("/api/v1", v1Router);
app.use("/api/v2", v2Router);
```

---

## Next Steps

- [Security](./05-security.md)
- [Reliability](./06-reliability.md)
