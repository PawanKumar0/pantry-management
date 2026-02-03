# Database Design & Optimization

> PostgreSQL optimization patterns for high-performance applications.

---

## Table of Contents

1. [Schema Design Principles](#schema-design-principles)
2. [Indexing Strategies](#indexing-strategies)
3. [Query Optimization](#query-optimization)
4. [Multi-Tenancy Patterns](#multi-tenancy-patterns)
5. [Connection Pooling](#connection-pooling)
6. [Partitioning](#partitioning)

---

## Schema Design Principles

### Normalization vs Denormalization

| Approach     | Pros                    | Cons           | Use Case                   |
| ------------ | ----------------------- | -------------- | -------------------------- |
| Normalized   | Less storage, integrity | Slower reads   | Write-heavy (transactions) |
| Denormalized | Faster reads            | Update anomaly | Read-heavy (analytics)     |

### Our Hybrid Approach

```sql
-- Normalized: Order relationships
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  status order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL  -- Denormalized: snapshot price
);
```

---

## Indexing Strategies

### Index Types

| Type   | Use Case                | Example                   |
| ------ | ----------------------- | ------------------------- |
| B-Tree | Equality, range queries | `WHERE status = 'active'` |
| GIN    | Full-text, JSONB        | `WHERE tags @> '{"veg"}'` |
| BRIN   | Large ordered tables    | Time-series data          |

### Multi-Tenant Indexes

```sql
-- Composite index with tenant first
CREATE INDEX idx_orders_org_status ON orders(organization_id, status);
CREATE INDEX idx_orders_org_created ON orders(organization_id, created_at DESC);

-- Covering index
CREATE INDEX idx_items_menu ON items(organization_id, category_id, is_available)
  INCLUDE (name, price, icon);

-- Partial index for active orders only
CREATE INDEX idx_active_orders ON orders(organization_id, status)
  WHERE status IN ('pending', 'confirmed', 'preparing');
```

---

## Query Optimization

### Common Patterns

```sql
-- ❌ Slow: SELECT *
SELECT * FROM items WHERE organization_id = 'org-123';

-- ✅ Fast: Select only needed columns
SELECT id, name, price FROM items WHERE organization_id = 'org-123';

-- ❌ Slow: LIKE with leading wildcard
SELECT * FROM items WHERE name LIKE '%coffee%';

-- ✅ Fast: Full-text search
SELECT * FROM items
WHERE to_tsvector('english', name) @@ to_tsquery('coffee');
```

---

## Multi-Tenancy Patterns

### Row-Level Security (RLS)

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON orders
  FOR ALL
  USING (organization_id = current_setting('app.current_organization')::uuid);
```

---

## Connection Pooling

```
App Pods → PgBouncer (20 connections) → PostgreSQL
```

```ini
# pgbouncer.ini
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
```

---

## Partitioning

### Time-Based for Orders

```sql
CREATE TABLE orders (...) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2024_01 PARTITION OF orders
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

---

## Next Steps

- [API Design Patterns](./04-api-design.md)
- [Security](./05-security.md)
