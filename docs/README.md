# Pantry Management System - Documentation

Welcome to the comprehensive documentation for the Pantry Management System, a QR-based meeting room ordering platform.

## Documentation Structure

### 📐 [Architecture](./architecture/)

- [System Overview](./architecture/01-system-overview.md) - High-level architecture
- [Component Design](./architecture/02-components.md) - Detailed component breakdown
- [Data Flow](./architecture/03-data-flow.md) - Request/response flows

### 🔧 [System Design](./system-design/)

- [Distributed Systems](./system-design/01-distributed-systems.md) - Scaling patterns
- [Caching Strategies](./system-design/02-caching.md) - Redis & multi-layer caching
- [Database Design](./system-design/03-database.md) - PostgreSQL optimization
- [API Design](./system-design/04-api-design.md) - REST & real-time patterns
- [Security](./system-design/05-security.md) - Auth, encryption, OWASP
- [Reliability](./system-design/06-reliability.md) - Fault tolerance & resilience

### ☁️ [DevOps](./devops/)

- [Cloud Comparison](./devops/01-cloud-comparison.md) - Azure vs AWS vs GCP
- [Free Tier Setup](./devops/02-free-tier-setup.md) - Step-by-step guides
- [Kubernetes](./devops/03-kubernetes.md) - K8s deployment guide
- [CI/CD](./devops/04-ci-cd.md) - GitHub Actions pipelines

### 📊 [Monitoring](./monitoring/)

- [Observability](./monitoring/01-observability.md) - Metrics, logs, traces
- [Prometheus Setup](./monitoring/02-prometheus.md) - Metrics collection
- [Grafana Dashboards](./monitoring/03-grafana.md) - Visualization
- [Alerting](./monitoring/04-alerting.md) - Alert rules & escalation

### 📚 [Guides](./guides/)

- [Local Development](./guides/local-dev.md) - Getting started
- [Deployment](./guides/deployment.md) - Production checklist
- [Troubleshooting](./guides/troubleshooting.md) - Common issues

---

## Quick Start

```bash
# Start local development cluster
cd devops && docker-compose up -d

# Run server
cd server && npm run dev

# Run Flutter app
cd apps/pantry_app && fvm flutter run
```

## Tech Stack

| Layer          | Technology                   |
| -------------- | ---------------------------- |
| API Server     | Node.js, Express, TypeScript |
| Database       | PostgreSQL + Prisma ORM      |
| Cache          | Redis                        |
| Real-time      | Socket.IO                    |
| Mobile App     | Flutter + Riverpod           |
| Infrastructure | Kubernetes, Docker           |
| Monitoring     | Prometheus, Grafana, Loki    |
