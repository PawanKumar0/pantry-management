# Prometheus Setup

> Metrics collection and configuration.

---

## Installation

### Kubernetes (Helm)

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace
```

---

## ServiceMonitor

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

## Key Metrics

| Metric                          | Type      | Description            |
| ------------------------------- | --------- | ---------------------- |
| `http_requests_total`           | Counter   | Total HTTP requests    |
| `http_request_duration_seconds` | Histogram | Request latency        |
| `nodejs_active_handles_total`   | Gauge     | Active Node.js handles |
| `pg_stat_activity_count`        | Gauge     | PostgreSQL connections |

---

## Queries

```promql
# Request rate per second
rate(http_requests_total[5m])

# Error rate percentage
100 * rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

---

## Next Steps

- [Grafana Dashboards](./03-grafana.md)
- [Alerting](./04-alerting.md)
